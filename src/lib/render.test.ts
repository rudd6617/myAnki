import { describe, it, expect } from "vitest";
import { renderClozeField, rewriteMedia, buildCards } from "./render";
import type { ParsedNoteType } from "./notetype";
import type { ApkgRaw } from "./apkg";

describe("renderClozeField", () => {
  const text = "React 中 {{c1::useState}} 用於 {{c2::管理狀態::state}}";

  it("front: masks target group with [...]", () => {
    expect(renderClozeField(text, 1, "front")).toBe(
      'React 中 <span class="cloze">[...]</span> 用於 管理狀態',
    );
  });

  it("front: uses hint when present", () => {
    expect(renderClozeField(text, 2, "front")).toBe(
      'React 中 useState 用於 <span class="cloze">[state]</span>',
    );
  });

  it("back: reveals target with highlight class", () => {
    expect(renderClozeField(text, 1, "back")).toBe(
      'React 中 <span class="cloze cloze-revealed">useState</span> 用於 管理狀態',
    );
  });

  it("non-target groups always render as plain answer", () => {
    expect(renderClozeField(text, 2, "back")).toBe(
      'React 中 useState 用於 <span class="cloze cloze-revealed">管理狀態</span>',
    );
  });

  it("handles HTML inside cloze content", () => {
    const html = "答 {{c1::<b>useState</b>::hint}}";
    expect(renderClozeField(html, 1, "front")).toBe(
      '答 <span class="cloze">[hint]</span>',
    );
    expect(renderClozeField(html, 1, "back")).toBe(
      '答 <span class="cloze cloze-revealed"><b>useState</b></span>',
    );
  });
});

describe("rewriteMedia", () => {
  const mediaMap = new Map([
    ["cat.jpg", "aaa".repeat(21) + "a"], // 64-char placeholder
    ["diagram.png", "bbb".repeat(21) + "b"],
  ]);

  it('rewrites <img src="known.jpg"> to /media/<sha>', () => {
    const out = rewriteMedia('<img src="cat.jpg">', mediaMap, new Set());
    expect(out).toBe(`<img src="/media/${mediaMap.get("cat.jpg")}">`);
  });

  it("preserves other img attributes", () => {
    const out = rewriteMedia(
      '<img alt="x" src="diagram.png" width="100">',
      mediaMap,
      new Set(),
    );
    expect(out).toContain(`src="/media/${mediaMap.get("diagram.png")}"`);
    expect(out).toContain(`alt="x"`);
    expect(out).toContain(`width="100"`);
  });

  it("records unresolved filenames", () => {
    const unresolved = new Set<string>();
    rewriteMedia('<img src="missing.jpg">', mediaMap, unresolved);
    expect(unresolved.has("missing.jpg")).toBe(true);
  });

  it("strips [sound:...] entirely", () => {
    expect(rewriteMedia("hello [sound:audio.mp3] world", mediaMap, new Set())).toBe(
      "hello  world",
    );
  });

  it("handles single-quoted src", () => {
    const out = rewriteMedia("<img src='cat.jpg' />", mediaMap, new Set());
    expect(out).toContain(`src="/media/${mediaMap.get("cat.jpg")}"`);
  });
});

describe("buildCards — basic", () => {
  const basicNotetype: ParsedNoteType = {
    anki_id: "1",
    name: "Basic",
    kind: "basic",
    css: ".card{}",
    fields: [
      { name: "Front", ord: 0 },
      { name: "Back", ord: 1 },
    ],
    templates: [
      { ord: 0, name: "Card 1", qfmt: "{{Front}}", afmt: "{{FrontSide}}<hr>{{Back}}" },
    ],
  };

  it("renders a single Basic card with field substitution and FrontSide", () => {
    const raw: ApkgRaw = {
      deckName: "t",
      col: { models: "", decks: "" },
      notes: [{ id: 1, guid: "n1", mid: 1, flds: "Q?\x1fA!", tags: "" }],
      cards: [{ id: 1, nid: 1, did: 1, ord: 0 }],
      media: [],
    };
    const out = buildCards(raw, new Map([["1", basicNotetype]]), new Map());
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0]!.guid).toBe("n1#0");
    expect(out.cards[0]!.front_html).toBe("Q?");
    expect(out.cards[0]!.back_html).toBe("Q?<hr>A!");
  });

  it("Basic-reversed picks template by ord", () => {
    const reversed: ParsedNoteType = {
      ...basicNotetype,
      templates: [
        { ord: 0, name: "fwd", qfmt: "{{Front}}", afmt: "{{Back}}" },
        { ord: 1, name: "rev", qfmt: "{{Back}}", afmt: "{{Front}}" },
      ],
    };
    const raw: ApkgRaw = {
      deckName: "t",
      col: { models: "", decks: "" },
      notes: [{ id: 1, guid: "n1", mid: 1, flds: "Q\x1fA", tags: "" }],
      cards: [
        { id: 1, nid: 1, did: 1, ord: 0 },
        { id: 2, nid: 1, did: 1, ord: 1 },
      ],
      media: [],
    };
    const out = buildCards(raw, new Map([["1", reversed]]), new Map());
    expect(out.cards.map((c) => [c.guid, c.front_html, c.back_html])).toEqual([
      ["n1#0", "Q", "A"],
      ["n1#1", "A", "Q"],
    ]);
  });
});

describe("buildCards — cloze", () => {
  const clozeNotetype: ParsedNoteType = {
    anki_id: "2",
    name: "Cloze",
    kind: "cloze",
    css: "",
    fields: [
      { name: "Text", ord: 0 },
      { name: "Extra", ord: 1 },
    ],
    templates: [
      { ord: 0, name: "Cloze", qfmt: "{{cloze:Text}}", afmt: "{{cloze:Text}}<br>{{Extra}}" },
    ],
  };

  it("renders one card per ord, masking the matching cN group", () => {
    const raw: ApkgRaw = {
      deckName: "t",
      col: { models: "", decks: "" },
      notes: [
        {
          id: 10,
          guid: "n10",
          mid: 2,
          flds: "{{c1::A}} 與 {{c2::B}}\x1f補充",
          tags: "",
        },
      ],
      cards: [
        { id: 1, nid: 10, did: 1, ord: 0 },
        { id: 2, nid: 10, did: 1, ord: 1 },
      ],
      media: [],
    };
    const out = buildCards(raw, new Map([["2", clozeNotetype]]), new Map());
    expect(out.cards).toHaveLength(2);
    expect(out.cards[0]!.guid).toBe("n10#0");
    expect(out.cards[0]!.front_html).toContain('<span class="cloze">[...]</span>');
    expect(out.cards[0]!.front_html).toContain("B"); // c2 stays visible
    expect(out.cards[0]!.back_html).toContain("cloze-revealed");
    expect(out.cards[0]!.back_html).toContain("補充");
  });
});

describe("buildCards — conditionals & directives", () => {
  const nt: ParsedNoteType = {
    anki_id: "3",
    name: "WithCond",
    kind: "basic",
    css: "",
    fields: [
      { name: "Front", ord: 0 },
      { name: "Extra", ord: 1 },
    ],
    templates: [
      {
        ord: 0,
        name: "c",
        qfmt: "{{Front}}{{#Extra}}<div>{{Extra}}</div>{{/Extra}}",
        afmt: "{{^Extra}}no extra{{/Extra}}{{Front}}",
      },
    ],
  };

  it("renders {{#Field}} block when field non-empty", () => {
    const raw: ApkgRaw = {
      deckName: "t",
      col: { models: "", decks: "" },
      notes: [{ id: 1, guid: "n", mid: 3, flds: "Q\x1fhi", tags: "" }],
      cards: [{ id: 1, nid: 1, did: 1, ord: 0 }],
      media: [],
    };
    const out = buildCards(raw, new Map([["3", nt]]), new Map());
    expect(out.cards[0]!.front_html).toBe("Q<div>hi</div>");
    expect(out.cards[0]!.back_html).toBe("Q");
  });

  it("renders {{^Field}} block when field empty", () => {
    const raw: ApkgRaw = {
      deckName: "t",
      col: { models: "", decks: "" },
      notes: [{ id: 1, guid: "n", mid: 3, flds: "Q\x1f", tags: "" }],
      cards: [{ id: 1, nid: 1, did: 1, ord: 0 }],
      media: [],
    };
    const out = buildCards(raw, new Map([["3", nt]]), new Map());
    expect(out.cards[0]!.front_html).toBe("Q");
    expect(out.cards[0]!.back_html).toBe("no extraQ");
  });
});

describe("buildCards — fallback notetype", () => {
  it("dumps all non-empty fields when notetype missing", () => {
    const raw: ApkgRaw = {
      deckName: "t",
      col: { models: "", decks: "" },
      notes: [{ id: 1, guid: "n", mid: 999, flds: "A\x1fB\x1f", tags: "" }],
      cards: [{ id: 1, nid: 1, did: 1, ord: 0 }],
      media: [],
    };
    const out = buildCards(raw, new Map(), new Map());
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0]!.front_html).toBe("A<br>B");
    expect(out.cards[0]!.notetype_anki_id).toBe("fallback");
  });
});
