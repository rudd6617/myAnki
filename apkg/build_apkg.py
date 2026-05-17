# -*- coding: utf-8 -*-
"""產生 Python 八股文 Anki 牌組 (.apkg)"""
import genanki
import random

DECK_ID = 1748391021
MODEL_ID = 1748391022

model = genanki.Model(
    MODEL_ID,
    'Python 八股文 Model',
    fields=[{'name': 'Question'}, {'name': 'Answer'}],
    templates=[{
        'name': 'Card 1',
        'qfmt': '<div style="font-size:20px;font-family:Microsoft JhengHei,sans-serif;">{{Question}}</div>',
        'afmt': '{{FrontSide}}<hr id="answer"><div style="font-size:16px;line-height:1.7;font-family:Microsoft JhengHei,sans-serif;text-align:left;">{{Answer}}</div>',
    }],
    css="""
.card { font-family: 'Microsoft JhengHei', sans-serif; font-size: 16px; text-align: left; color: #222; background: #fafafa; padding: 12px; }
pre, code { background:#eee; padding:2px 4px; border-radius:3px; font-family: Consolas, monospace; }
pre { padding: 8px; display:block; white-space: pre-wrap; }
ul, ol { padding-left: 22px; }
li { margin: 4px 0; }
b { color:#0a58ca; }
"""
)

qa = [
    # 1
    ("解釋型語言 Python 和編譯型語言有什麼區別？",
     "<b>編譯型語言</b>(如 C/C++)先由編譯器將原始碼一次性翻譯成機器碼,執行速度快但需先編譯、跨平台需重新編譯。<br>"
     "<b>解釋型語言</b>(如 Python)由直譯器逐行解析執行,跨平台性佳、開發效率高,但執行速度較慢。<br>"
     "Python 實際先把 .py 編譯成 .pyc 位元組碼,再由 PVM 直譯執行,因此屬於「先編譯後解釋」的混合型,但歸類為解釋型語言。"),
    # 2
    ("Python3 中 is 和 == 有什麼區別？",
     "<b>==</b>:比較兩個物件的<b>值</b>是否相等,內部會呼叫 <code>__eq__</code>。<br>"
     "<b>is</b>:比較兩個物件的<b>身份</b>(記憶體位址,即 <code>id()</code>)是否相同。<br>"
     "<pre>a = [1,2]; b = [1,2]\na == b  # True\na is b  # False</pre>"
     "對於小整數(-5~256)和短字串,Python 會做快取,is 可能為 True,但不可依賴。"),
    # 3
    ("Python 中 any() 和 all() 方法有什麼作用？",
     "<b>any(iterable)</b>:可迭代物件中任一元素為 True 即回傳 True,全為 False 才回 False;空集合回 False。<br>"
     "<b>all(iterable)</b>:全部元素為 True 才回 True,任一為 False 即回 False;空集合回 True。<br>"
     "<pre>any([0,'',None,1])  # True\nall([1,2,3])        # True\nall([])             # True</pre>"),
    # 4
    ("説明 Python3 中裝飾器的用法",
     "裝飾器是一個接收函式並回傳新函式的可呼叫物件,常用於在不修改原函式情況下擴充功能(日誌、計時、權限驗證、快取等)。<br>"
     "<pre>def log(func):\n    def wrapper(*a, **kw):\n        print(f'call {func.__name__}')\n        return func(*a, **kw)\n    return wrapper\n\n@log\ndef add(x, y):\n    return x + y</pre>"
     "<code>@log</code> 等價於 <code>add = log(add)</code>。可使用 <code>functools.wraps</code> 保留原函式中繼資料,也可寫成帶參數的裝飾器(三層巢狀)。"),
    # 5
    ("説明 Python3 中 yield 的用法",
     "yield 用於定義<b>生成器函式</b>,呼叫時不立即執行,而是回傳生成器物件;每次 next() 執行到 yield 暫停並回傳值,下次再從該處恢復,實作惰性求值,節省記憶體。<br>"
     "<pre>def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\nlist(fib(5))  # [0,1,1,2,3]</pre>"
     "yield 還可作為協程的暫停點(<code>yield value</code>、<code>x = yield</code>、<code>yield from</code>)。"),
    # 6
    ("説明 Python 中 enumerate() 的用法",
     "enumerate 將可迭代物件包裝為「索引-元素」對,使迴圈可同時取得索引與值,避免使用 range(len(...))。<br>"
     "<pre>for i, v in enumerate(['a','b','c'], start=1):\n    print(i, v)\n# 1 a\n# 2 b\n# 3 c</pre>"
     "可指定 start 設定起始索引。"),
    # 7
    ("解釋 Python 中 //、% 和 ** 運算符",
     "<b>//</b>:整除(向下取整)。<code>7//2 = 3</code>、<code>-7//2 = -4</code>。<br>"
     "<b>%</b>:取餘數。<code>7%3 = 1</code>;對字串為格式化運算子。<br>"
     "<b>**</b>:次方。<code>2**10 = 1024</code>;在函式呼叫中表示展開字典。"),
    # 8
    ("Python 有哪些特點和優點？",
     "<ul>"
     "<li>語法簡潔、可讀性高</li>"
     "<li>跨平台、開源免費</li>"
     "<li>豐富的標準函式庫與第三方套件</li>"
     "<li>支援多範式:程序式、物件導向、函式式</li>"
     "<li>動態型別、自動垃圾回收</li>"
     "<li>可嵌入 C/C++,易於擴充</li>"
     "<li>廣泛應用於資料科學、AI、Web、運維、自動化等</li>"
     "</ul>"),
    # 9
    ("什麼是 Python 中的三元表達式？",
     "Python 沒有 C 風格 <code>?:</code>,改用條件表達式:<br>"
     "<pre>value = a if condition else b</pre>"
     "例:<code>max_v = x if x > y else y</code>。可巢狀但不建議過於複雜。"),
    # 10
    ("請簡單介紹 Python 的 Flask 框架,有什麼作用?",
     "Flask 是 Python 的<b>輕量級 Web 框架(microframework)</b>,基於 Werkzeug(WSGI)和 Jinja2(模板)。<br>"
     "特色:核心極簡、易上手、可擴充、彈性高,適合中小型網站或 API 服務。<br>"
     "<pre>from flask import Flask\napp = Flask(__name__)\n@app.route('/')\ndef hi():\n    return 'Hello'</pre>"
     "與 Django 相比,Flask 不內建 ORM、表單、後台,需自行選擇套件組合。"),
    # 11
    ("如何在 Python 中管理內存?",
     "Python 透過<b>私有堆(private heap)</b>由直譯器統一管理。<br>"
     "<ul>"
     "<li><b>引用計數</b>:每個物件記錄被引用次數,計數歸零立即回收。</li>"
     "<li><b>分代垃圾回收</b>:對引用計數無法處理的循環引用,使用三代 GC(gc 模組)。</li>"
     "<li><b>記憶體池機制(pymalloc)</b>:小於 512 位元組的物件由 Python 自有的記憶體池分配,減少系統呼叫。</li>"
     "</ul>"
     "可用 <code>gc</code>、<code>sys.getrefcount</code>、<code>tracemalloc</code> 觀察。"),
    # 12
    ("Python 中 help() 函數和 dir() 函數有什麼作用?",
     "<b>help(obj)</b>:在互動式環境中顯示物件/模組/函式的說明文件(docstring)。<br>"
     "<b>dir(obj)</b>:列出物件的所有屬性與方法名稱(包括繼承的)。<br>"
     "<pre>import math\ndir(math)   # 列出 math 模組成員\nhelp(math.sqrt)</pre>"),
    # 13
    ("Python 程序退出時,是否釋放所有內存分配?",
     "<b>不一定</b>。Python 結束時會由作業系統回收行程占用的記憶體,但 Python 本身對「具有循環引用且擁有 <code>__del__</code> 的物件」或<b>被 C 函式庫保留的全域物件、模組級物件</b>不一定能主動清除。<br>"
     "另外,某些被全域變數參考的資源、未關閉的檔案/連線,在退出時可能不會優雅釋放。實務上應使用 with、try/finally 或 atexit 確保清理。"),
    # 14
    ("什麼是 Python 的負索引?",
     "Python 序列(list、tuple、str)支援負索引,從尾端反向取值:<code>-1</code> 表最後一個元素,<code>-2</code> 表倒數第二個,以此類推。<br>"
     "<pre>s = 'abcdef'\ns[-1]   # 'f'\ns[-3:]  # 'def'</pre>"),
    # 15
    ("Python 是否區分大小寫?",
     "<b>區分大小寫</b>。<code>name</code>、<code>Name</code>、<code>NAME</code> 是三個不同識別字。關鍵字(如 True、False、None)首字母大寫,寫成 true 將報 NameError。"),
    # 16
    ("説明 Python 中標識符的命名規則",
     "<ul>"
     "<li>由字母、數字、底線組成,不可以數字開頭。</li>"
     "<li>區分大小寫。</li>"
     "<li>不可使用關鍵字(if、class、for...)。</li>"
     "<li>慣例:變數/函式用 snake_case;類別用 CamelCase;常數用 UPPER_CASE;單前置底線 <code>_x</code> 表內部使用;雙前置底線 <code>__x</code> 觸發名稱重整(name mangling);<code>__x__</code> 為魔術方法。</li>"
     "</ul>"),
    # 17
    ("Python 中如何刪除字符串中的前置空格?",
     "<b>lstrip()</b> 移除左側空白;<b>rstrip()</b> 右側;<b>strip()</b> 兩側。可指定要移除的字元集合。<br>"
     "<pre>'  hello'.lstrip()      # 'hello'\n'***hi***'.strip('*')   # 'hi'</pre>"),
    # 18
    ("Python 中如何將字符串轉換為小寫?",
     "使用 <code>str.lower()</code>(全部小寫)或 <code>str.casefold()</code>(更激進的小寫,適合多語言比較)。<br>"
     "<pre>'HELLO'.lower()       # 'hello'\n'ß'.lower()           # 'ß'\n'ß'.casefold()        # 'ss'</pre>"),
    # 19
    ("Python 的 pass 語句有什麼作用?",
     "pass 是<b>空操作佔位符</b>,語法上需要陳述句但暫時不想實作時使用,避免語法錯誤。<br>"
     "<pre>class Empty:\n    pass\n\ndef todo():\n    pass</pre>"
     "與 continue(跳過本次迴圈)、return(結束函式)不同。"),
    # 20
    ("什麼是 Python 的關係運算符?",
     "用於比較兩值大小,結果為 bool。包含:<code>==、!=、&gt;、&lt;、&gt;=、&lt;=</code>。可鏈式書寫:<code>1 &lt; x &lt; 10</code>。"),
    # 21
    ("什麼是 Python 的賦值和算術運算符?",
     "<b>賦值</b>:<code>=、+=、-=、*=、/=、//=、%=、**=、&amp;=、|=、^=、&gt;&gt;=、&lt;&lt;=</code>。<br>"
     "<b>算術</b>:<code>+(加)、-(減)、*(乘)、/(真除)、//(整除)、%(取餘)、**(次方)</code>。"),
    # 22
    ("什麼是 Python 的邏輯運算符?",
     "<b>and / or / not</b>。<br>"
     "<ul>"
     "<li>and:左為假則回左值,否則回右值。</li>"
     "<li>or:左為真則回左值,否則回右值。</li>"
     "<li>具備短路求值。</li>"
     "</ul>"
     "<pre>0 and 5     # 0\n2 or 3      # 2\nnot 0       # True</pre>"),
    # 23
    ("什麼是 Python 的成員運算符?",
     "<b>in / not in</b>,判斷元素是否屬於序列/集合/字典(對字典是判斷鍵)。<br>"
     "<pre>3 in [1,2,3]          # True\n'a' in {'a':1}        # True</pre>"),
    # 24
    ("什麼是 Python 的身份運算符?",
     "<b>is / is not</b>,判斷兩個變數是否指向同一物件(id 相同)。常用於與 <code>None</code> 比較:<code>x is None</code>。不要用 is 比較字面數值或字串。"),
    # 25
    ("什麼是 Python 的位運算符?",
     "對整數的二進位逐位操作:<code>&amp;(且)、|(或)、^(異或)、~(取反)、&lt;&lt;(左移)、&gt;&gt;(右移)</code>。<br>"
     "<pre>5 &amp; 3   # 1\n5 | 3   # 7\n5 ^ 3   # 6\n~5      # -6\n1 &lt;&lt; 3  # 8</pre>"),
    # 26
    ("如何在 Python 中使用多進制數字?",
     "字面量前綴:<br>"
     "<ul>"
     "<li>二進位 <code>0b1010</code></li>"
     "<li>八進位 <code>0o17</code></li>"
     "<li>十六進位 <code>0xFF</code></li>"
     "</ul>"
     "轉換函式:<code>bin(10)、oct(10)、hex(255)、int('FF',16)</code>。"),
    # 27
    ("Python 中如何獲取字典的所有鍵?",
     "<code>dict.keys()</code> 取得鍵視圖;通常以 <code>list(d.keys())</code> 轉成串列。<br>"
     "<pre>d = {'a':1,'b':2}\nlist(d.keys())   # ['a','b']\nfor k in d:      # 直接迭代字典即為迭代鍵\n    print(k)</pre>"),
    # 28
    ("為什麼 Python 不建議使用下劃線開頭的標識符?",
     "底線開頭具特殊含意:<br>"
     "<ul>"
     "<li><code>_x</code>:慣例上代表「私有/內部使用」,<code>from m import *</code> 不會匯入。</li>"
     "<li><code>__x</code>:在類別中觸發 name mangling,變成 <code>_ClassName__x</code>。</li>"
     "<li><code>__x__</code>:魔術方法/雙底線屬性,由 Python 解析器保留。</li>"
     "</ul>"
     "誤用會造成存取困難或與內建衝突。"),
    # 29
    ("Python 如何聲明多個變量並賦值?",
     "<ul>"
     "<li>多目標賦值:<code>a = b = c = 0</code>。</li>"
     "<li>序列解包:<code>x, y, z = 1, 2, 3</code> 或 <code>a, *rest = [1,2,3,4]</code>。</li>"
     "<li>交換值:<code>a, b = b, a</code>。</li>"
     "</ul>"),
    # 30
    ("什麼是 Python 元組的解封裝?",
     "把可迭代物件的元素分別綁定到多個變數的過程,稱為「解包(unpacking)」。<br>"
     "<pre>t = (1, 2, 3)\na, b, c = t\nhead, *tail = [1, 2, 3, 4]   # head=1, tail=[2,3,4]\nfor k, v in {'a':1,'b':2}.items():\n    ...</pre>"),
    # 31
    ("什麼是 Python?為什麼它會這麼流行?",
     "Python 是 Guido van Rossum 於 1989 年設計的高階、解釋型、動態型別、物件導向程式語言。流行原因:<br>"
     "<ul>"
     "<li>語法簡潔、學習曲線平緩。</li>"
     "<li>生態繁榮:NumPy、Pandas、TensorFlow、Django、Flask 等。</li>"
     "<li>跨領域:資料分析、AI/ML、Web、自動化、運維、爬蟲、科學運算。</li>"
     "<li>跨平台、社群活躍、開源免費。</li>"
     "</ul>"),
    # 32
    ("請列舉一些 Python 的應用場景",
     "<ul>"
     "<li>Web 開發:Django、Flask、FastAPI</li>"
     "<li>資料科學與分析:Pandas、NumPy、Matplotlib</li>"
     "<li>機器學習/深度學習:scikit-learn、PyTorch、TensorFlow</li>"
     "<li>自動化測試與運維:Selenium、Ansible、Fabric</li>"
     "<li>網路爬蟲:Requests、Scrapy、Playwright</li>"
     "<li>金融量化、影像處理(OpenCV)、自然語言處理</li>"
     "<li>嵌入式腳本、遊戲(Pygame)、桌面 GUI(Tk、PyQt)</li>"
     "</ul>"),
    # 33
    ("Python 有哪些侷限性?",
     "<ul>"
     "<li>執行速度較慢(直譯型 + 動態型別)。</li>"
     "<li>GIL 限制 CPython 多執行緒在 CPU 密集任務的並行能力。</li>"
     "<li>記憶體消耗較大。</li>"
     "<li>行動端/手機開發支援薄弱。</li>"
     "<li>動態型別導致部分錯誤須執行期才能發現。</li>"
     "<li>原生不適合對延遲極敏感的場景。</li>"
     "</ul>"),
    # 34
    ("請解釋 Python 代碼的執行過程?",
     "<ol>"
     "<li><b>詞法/語法分析</b>:.py 原始碼解析為 AST。</li>"
     "<li><b>編譯</b>:AST 編譯成位元組碼(.pyc,存於 __pycache__)。</li>"
     "<li><b>執行</b>:由 PVM(Python Virtual Machine)逐條解釋執行位元組碼。</li>"
     "</ol>"
     "因此 Python 屬於「先編譯位元組碼、再由 VM 解釋」的混合模式。"),
    # 35
    ("Python 有哪些內置數據結構?",
     "<ul>"
     "<li>數值:int、float、complex、bool</li>"
     "<li>序列:list、tuple、range、str、bytes、bytearray</li>"
     "<li>集合:set、frozenset</li>"
     "<li>映射:dict</li>"
     "<li>None</li>"
     "</ul>"
     "collections 模組提供:deque、Counter、OrderedDict、defaultdict、namedtuple 等。"),
    # 36
    ("Python 中單引號和雙引號有什麼區別?",
     "<b>沒有語意差別</b>,皆表示字串。實務上選擇便於閱讀者:當字串內含 ' 時用 \" 較簡潔,反之亦然,避免轉義。三引號 ''' / \"\"\" 用於多行字串或 docstring。"),
    # 37
    ("Python 中 break、continue、pass 有什麼作用?",
     "<b>break</b>:跳出最內層迴圈。<br>"
     "<b>continue</b>:跳過本次迴圈剩餘部分,繼續下次迭代。<br>"
     "<b>pass</b>:空操作,僅佔位,不改變執行流。"),
    # 38
    ("Python 中如何實現 switch 語句?",
     "<ul>"
     "<li>Python 3.10+ 可用 <b>match-case</b>(結構模式比對)。</li>"
     "<li>傳統做法:if/elif/else 鏈,或字典分派(dispatch table):</li>"
     "</ul>"
     "<pre>actions = {'add': add, 'sub': sub}\nactions.get(cmd, default)()</pre>"),
    # 39
    ("Python 的 range 函數如何運用?請舉例説明",
     "range(stop) / range(start, stop) / range(start, stop, step) 產生整數序列,不含 stop。<br>"
     "<pre>list(range(5))         # [0,1,2,3,4]\nlist(range(1,10,2))    # [1,3,5,7,9]\nlist(range(10,0,-1))   # 10..1</pre>"
     "在 Python 3 中是惰性物件,佔用空間極小。"),
    # 40
    ("如何更改 Python 列表的數據類型?",
     "使用內建建構子:<code>tuple(lst)</code>、<code>set(lst)</code>、<code>frozenset(lst)</code>、<code>dict(...)</code>。對元素轉型用串列推導:<code>[int(x) for x in lst]</code>。"),
    # 41
    ("Python 中怎麼註釋代碼?",
     "<ul>"
     "<li>單行:<code># 註解</code></li>"
     "<li>多行:連續 # 或使用三引號字串(嚴格說是字串字面量,但常作多行註解)</li>"
     "<li>函式/類別/模組首行的字串為 <b>docstring</b>,可用 <code>help()</code> 或 <code>obj.__doc__</code> 查閱。</li>"
     "</ul>"),
    # 42
    ("Python 是否有 main 函數?",
     "Python 沒有強制的 main 入口。常見慣例:<br>"
     "<pre>def main():\n    ...\n\nif __name__ == '__main__':\n    main()</pre>"
     "<code>__name__</code> 在直接執行時為 <code>'__main__'</code>,被 import 時為模組名,藉此區分入口。"),
    # 43
    ("Python 中如何使用索引反轉字符串?",
     "<pre>s = 'hello'\ns[::-1]    # 'olleh'</pre>"
     "切片 <code>[start:stop:step]</code>,step=-1 表示倒序。亦可 <code>''.join(reversed(s))</code>。"),
    # 44
    ("為什麼 Python 中沒有函數重載?",
     "Python 動態型別,參數無型別宣告;同名函式後者會覆蓋前者。可用以下機制達成類似效果:<br>"
     "<ul>"
     "<li>預設值參數、<code>*args/**kwargs</code> 處理可變參數。</li>"
     "<li>在函式內手動依型別分支。</li>"
     "<li><code>functools.singledispatch</code> 依首個引數型別分派。</li>"
     "</ul>"),
    # 45
    ("你知道哪些 Python 魔術方法?",
     "魔術方法(dunder methods)由雙底線包圍,Python 在特定運算時自動呼叫:<br>"
     "<ul>"
     "<li>建構/解構:<code>__init__、__new__、__del__</code></li>"
     "<li>字串表示:<code>__str__、__repr__</code></li>"
     "<li>比較:<code>__eq__、__lt__、__hash__</code></li>"
     "<li>容器:<code>__len__、__getitem__、__setitem__、__iter__、__next__、__contains__</code></li>"
     "<li>呼叫:<code>__call__</code></li>"
     "<li>運算子:<code>__add__、__sub__、__mul__、__truediv__</code></li>"
     "<li>情境管理:<code>__enter__、__exit__</code></li>"
     "<li>屬性存取:<code>__getattr__、__setattr__、__getattribute__</code></li>"
     "</ul>"),
    # 46
    ("請介紹 Python 中變量的作用域?",
     "依 <b>LEGB</b> 規則查找:<br>"
     "<ul>"
     "<li><b>L</b>ocal:函式內部</li>"
     "<li><b>E</b>nclosing:外層函式(閉包)</li>"
     "<li><b>G</b>lobal:模組層級</li>"
     "<li><b>B</b>uilt-in:內建命名空間</li>"
     "</ul>"
     "<code>global</code> 宣告改寫模組層變數;<code>nonlocal</code> 改寫外層函式變數。"),
    # 47
    ("如何在 Python 中實現字符串替換操作?",
     "<ul>"
     "<li><code>str.replace(old, new, count=-1)</code> 直接替換。</li>"
     "<li><code>re.sub(pattern, repl, string)</code> 正規表示式替換。</li>"
     "<li><code>str.translate(table)</code> 字元映射替換。</li>"
     "</ul>"),
    # 48
    ("你知道哪些 Python 的編碼規範?",
     "<b>PEP 8</b> 為官方風格指南,要點:<br>"
     "<ul>"
     "<li>縮排 4 空格,不混用 tab。</li>"
     "<li>每行 ≤79 字元(註解 ≤72)。</li>"
     "<li>函式/變數 snake_case,類別 CamelCase,常數 UPPER_CASE。</li>"
     "<li>運算子兩側留空格;函式定義之間空兩行。</li>"
     "<li>import 分三組:標準庫、第三方、本地,組間空一行。</li>"
     "<li><b>PEP 257</b> 規範 docstring;可用 flake8、black、isort、ruff 強制執行。</li>"
     "</ul>"),
    # 49
    ("__init__ 方法在 Python 中有什麼作用?",
     "<code>__init__</code> 是<b>初始化方法</b>(非構造方法),由 <code>__new__</code> 建立實例後自動呼叫,用以設定實例的初始屬性。<br>"
     "<pre>class Dog:\n    def __init__(self, name):\n        self.name = name\n\nd = Dog('Lucky')</pre>"),
    # 50
    ("什麼是鴨子類型(duck typing)?",
     "「若它走起來像鴨子、叫起來像鴨子,就把它當作鴨子」。Python 不檢查物件的型別,只關心其是否具備所需方法/屬性,例如任何實作 <code>__iter__</code> 的物件都可被迭代,而不需繼承特定基底類。"),
    # 51
    ("你使用過哪些 Python 標準庫模塊?",
     "<ul>"
     "<li>os、sys、pathlib、shutil、glob</li>"
     "<li>datetime、time、calendar</li>"
     "<li>collections、itertools、functools、operator</li>"
     "<li>json、csv、re、pickle、struct、base64</li>"
     "<li>threading、multiprocessing、concurrent.futures、asyncio、subprocess、queue</li>"
     "<li>logging、argparse、unittest、typing、dataclasses、enum</li>"
     "<li>socket、http、urllib、email</li>"
     "<li>math、random、statistics、decimal、fractions</li>"
     "</ul>"),
    # 52
    ("説明 Python 中的 zip 函數",
     "zip 將多個可迭代物件「並列」打包,以最短者為界(Python 3.10+ 可用 <code>strict=True</code>)。<br>"
     "<pre>list(zip([1,2,3], ['a','b','c']))\n# [(1,'a'),(2,'b'),(3,'c')]\nfor a, b in zip(xs, ys): ...\n# 解壓: list(zip(*pairs))</pre>"),
    # 53
    ("如何使用 Python 的 random 模塊生成隨機數、實現隨機亂序和隨機抽樣?",
     "<pre>import random\nrandom.random()             # [0,1) 浮點\nrandom.randint(1, 10)       # 含 10\nrandom.uniform(1.5, 3.5)\nrandom.choice([1,2,3])\nrandom.choices(pop, k=3)    # 有放回\nrandom.sample(pop, k=3)     # 無放回\nlst = [1,2,3,4]\nrandom.shuffle(lst)         # 就地洗牌\nrandom.seed(42)             # 設定種子</pre>"),
    # 54
    ("Python 中 read、readline、readlines 有哪些區別?",
     "<ul>"
     "<li><b>read([size])</b>:讀取整個檔案或指定位元組數,回傳字串。</li>"
     "<li><b>readline()</b>:讀一行,含換行符。</li>"
     "<li><b>readlines()</b>:讀全部行成 list,記憶體開銷大。</li>"
     "</ul>"
     "大檔案應直接 <code>for line in f:</code> 逐行迭代,效能與記憶體俱佳。"),
    # 55
    ("什麼是 Python 面向對象中的繼承特點?",
     "<ul>"
     "<li>子類別繼承父類別的屬性與方法,可覆寫(override)。</li>"
     "<li>支援<b>多重繼承</b>,以 <b>MRO(C3 線性化)</b>決定查找順序,可用 <code>Class.__mro__</code> 查看。</li>"
     "<li><code>super()</code> 依 MRO 呼叫父類方法。</li>"
     "<li>所有類別皆繼承自 <code>object</code>。</li>"
     "<li>支援 isinstance/issubclass 動態判斷。</li>"
     "</ul>"),
    # 56
    ("Python 中深拷貝和淺拷貝有什麼區別?",
     "<b>淺拷貝(copy.copy)</b>:複製最外層容器,內部物件仍共享參考。<br>"
     "<b>深拷貝(copy.deepcopy)</b>:遞迴複製所有內嵌物件,完全獨立。<br>"
     "<pre>import copy\na = [[1,2],[3,4]]\nb = copy.copy(a);     b[0][0] = 9   # a 也變\nc = copy.deepcopy(a); c[0][0] = 9   # a 不變</pre>"),
    # 57
    ("Python 中的列表和元組有什麼區別?",
     "<ul>"
     "<li>list 可變、tuple 不可變。</li>"
     "<li>tuple 占用記憶體較少、可作為 dict 鍵與 set 元素(若元素皆可雜湊)。</li>"
     "<li>list 提供 append/remove 等修改方法,tuple 無。</li>"
     "<li>tuple 效能略佳,適合表示固定結構(座標、紀錄)。</li>"
     "</ul>"),
    # 58
    ("什麼是 Python 的字典,有哪些用法?",
     "dict 是<b>鍵-值映射</b>,基於雜湊表;Python 3.7+ 保證插入順序。<br>"
     "<pre>d = {'a':1}\nd['b'] = 2\nd.get('c', 0)\nd.setdefault('c', [])\nd.update(other)\nd.pop('a')\nfor k, v in d.items(): ...</pre>"
     "鍵必須可雜湊(hashable)。"),
    # 59
    ("什麼是 Python 的閉包?",
     "閉包是<b>引用了外層函式變數的內部函式</b>。內部函式持有外層作用域的綁定,即使外層函式已退出仍可使用。<br>"
     "<pre>def make_adder(n):\n    def add(x):\n        return x + n\n    return add\nadd5 = make_adder(5)\nadd5(3)  # 8</pre>"
     "修改外層變數需用 <code>nonlocal</code>。"),
    # 60
    ("Python 中 append、insert 和 extend 有什麼區別?",
     "<ul>"
     "<li><code>append(x)</code>:在尾部加入<b>單一</b>元素 x。</li>"
     "<li><code>insert(i, x)</code>:在索引 i 處插入 x。</li>"
     "<li><code>extend(iterable)</code>:把可迭代物件的元素逐一加到尾部。</li>"
     "</ul>"
     "<pre>a=[1,2]\na.append([3,4])   # [1,2,[3,4]]\nb=[1,2]\nb.extend([3,4])   # [1,2,3,4]</pre>"),
    # 61
    ("Python 中 remove、del 和 pop 有什麼區別?",
     "<ul>"
     "<li><code>list.remove(value)</code>:刪除第一個等於 value 的元素。</li>"
     "<li><code>del lst[i]</code> / <code>del lst[a:b]</code>:依索引/切片刪除;也可刪變數。</li>"
     "<li><code>list.pop([i])</code>:彈出並回傳元素(預設最後一個)。</li>"
     "</ul>"),
    # 62
    ("Python 中的 != 和 is not 運算符有什麼區別?",
     "<b>!=</b>:值不相等(呼叫 <code>__eq__</code> 後取反)。<br>"
     "<b>is not</b>:不是同一物件(id 不同)。<br>"
     "判斷 None 用 <code>x is None</code> / <code>x is not None</code>。"),
    # 63
    ("Python 的 iterables 和 iterators 有什麼區別?",
     "<b>Iterable(可迭代物件)</b>:實作 <code>__iter__</code>,可被 <code>iter()</code> 呼叫產生迭代器,例:list、dict、str。<br>"
     "<b>Iterator(迭代器)</b>:同時實作 <code>__iter__</code> 與 <code>__next__</code>,具狀態,迭代結束抛 StopIteration。<br>"
     "迭代器一定是可迭代,但可迭代不一定是迭代器。"),
    # 64
    ("Python 中的 Map 函數有什麼作用?怎麼使用?",
     "map(func, iter1, iter2, ...) 對每個元素套用 func,回傳惰性迭代器。<br>"
     "<pre>list(map(str, [1,2,3]))            # ['1','2','3']\nlist(map(lambda x,y: x+y, [1,2], [3,4])) # [4,6]</pre>"
     "替代寫法:串列推導 <code>[str(x) for x in lst]</code>。"),
    # 65
    ("Python 中的 Filter 函數有什麼作用?怎麼使用?",
     "filter(func, iterable) 保留 func 回傳 True 的元素,惰性求值。<br>"
     "<pre>list(filter(lambda x: x%2==0, range(6)))  # [0,2,4]\nlist(filter(None, [0,1,'',2]))            # [1,2]</pre>"),
    # 66
    ("Python 中 reduce 函數有什麼作用?怎麼使用?",
     "<code>functools.reduce(func, iterable[, initial])</code> 累積套用,將序列歸併為單一值。<br>"
     "<pre>from functools import reduce\nreduce(lambda a,b: a+b, [1,2,3,4])        # 10\nreduce(lambda a,b: a*b, [1,2,3,4], 1)     # 24</pre>"),
    # 67
    ("什麼是 Python 的 pickling 和 unpickling?",
     "pickle 將 Python 物件序列化為位元組流(<code>pickle.dump/dumps</code>),反向稱反序列化(<code>pickle.load/loads</code>)。可用於物件持久化與行程間傳輸。<br>"
     "<b>注意</b>:pickle 不安全,不應反序列化來自不受信任來源的資料;跨語言交換建議改用 JSON。"),
    # 68
    ("什麼是 Python 的生成器?",
     "生成器是用 <code>yield</code> 或<b>生成器表達式</b>建立的特殊迭代器,惰性產生值,節省記憶體。<br>"
     "<pre>g = (x*x for x in range(1_000_000))\nnext(g)\n\ndef counter():\n    i = 0\n    while True:\n        yield i\n        i += 1</pre>"
     "也可作為協程(<code>send/throw/close</code>)。"),
    # 69
    ("什麼是 Python 的 Lambda 函數,有哪些應用場景?",
     "lambda 為匿名函式,語法 <code>lambda 參數: 表達式</code>,只能含一行表達式。<br>"
     "<pre>add = lambda x,y: x+y\nsorted(items, key=lambda x: x.age)\nmap(lambda x: x*2, lst)</pre>"
     "適合作為高階函式的回呼或排序鍵;邏輯複雜時應改用 def。"),
    # 70
    ("Python 的迭代器和生成器有什麼區別?",
     "<ul>"
     "<li>生成器是<b>實作迭代器協定的一種便捷方式</b>,自動產生 <code>__iter__/__next__</code>。</li>"
     "<li>普通迭代器須手動定義類別並維護狀態。</li>"
     "<li>生成器寫法更簡潔、可暫停/恢復;迭代器較通用、可控。</li>"
     "<li>所有生成器都是迭代器,反之不一定。</li>"
     "</ul>"),
    # 71
    ("Python 正則表達式中 match 和 search 有什麼區別?",
     "<ul>"
     "<li><code>re.match(pat, s)</code>:從<b>字串開頭</b>嘗試匹配,不匹配回 None。</li>"
     "<li><code>re.search(pat, s)</code>:掃描整個字串,回傳<b>第一個</b>匹配。</li>"
     "<li><code>re.fullmatch</code> 要求整體匹配;<code>re.findall/finditer</code> 取得所有匹配。</li>"
     "</ul>"),
    # 72
    ("Python 的 __init__ 和 __new__ 方法有什麼區別?",
     "<b>__new__(cls, ...)</b>:類別方法,負責<b>建立</b>並回傳實例(真正的建構)。<br>"
     "<b>__init__(self, ...)</b>:實例方法,在實例建立後<b>初始化</b>屬性,不回傳值。<br>"
     "若 __new__ 未回傳 cls 的實例,__init__ 不會被呼叫。需要客製化實例建立(如單例、不可變子類)時覆寫 __new__。"),
    # 73
    ("Python 函數參數 *arg 和 **kwargs 有什麼區別?怎麼使用?",
     "<b>*args</b>:把多餘的位置引數打包成 tuple。<br>"
     "<b>**kwargs</b>:把多餘的關鍵字引數打包成 dict。<br>"
     "<pre>def f(*args, **kwargs):\n    print(args, kwargs)\nf(1, 2, a=3)       # (1,2) {'a':3}\n\n# 解包\nvals = [1,2]; opts = {'a':3}\nf(*vals, **opts)</pre>"),
    # 74
    ("Python 2 和 Python 3 有什麼區別?",
     "<ul>"
     "<li>print 在 Py3 是函式;Py2 為陳述句。</li>"
     "<li>Py3 字串預設 Unicode(str/bytes 分離);Py2 預設 ASCII(str 與 unicode 分離)。</li>"
     "<li>/ 在 Py3 為真除,Py2 為整除(整除須 //)。</li>"
     "<li>range 在 Py3 為惰性物件(等同 Py2 xrange)。</li>"
     "<li>例外語法 <code>except E as e</code>。</li>"
     "<li>dict.keys/items/values 回傳視圖。</li>"
     "<li>Py2 已 EOL(2020),不再維護。</li>"
     "</ul>"),
    # 75
    ("什麼是「猴子補丁」(monkey patching)?",
     "執行期動態修改類別或模組的屬性/方法,稱為 monkey patching。常用於測試替身、修補第三方程式庫 bug、新增功能。<br>"
     "<pre>import requests\norig = requests.get\nrequests.get = lambda *a, **kw: 'mock'</pre>"
     "缺點:破壞封裝、難以除錯、影響全域,須謹慎使用並有限作用域。"),
    # 76
    ("Python 在什麼情況下會出現 KeyError、TypeError、ValueError?",
     "<ul>"
     "<li><b>KeyError</b>:存取 dict 不存在的鍵 <code>d['x']</code>。</li>"
     "<li><b>TypeError</b>:操作的型別不正確,如 <code>'a' + 1</code>、函式引數型別錯。</li>"
     "<li><b>ValueError</b>:型別正確但值不合法,如 <code>int('abc')</code>。</li>"
     "</ul>"),
    # 77
    ("什麼是 Python 中的模塊和包?",
     "<b>模組(module)</b>:一個 .py 檔案,可被 import。<br>"
     "<b>套件(package)</b>:含 <code>__init__.py</code>(可為空,Py3.3+ 支援命名空間套件)的目錄,內部可放多個模組與子套件。<br>"
     "藉由 import 與 from ... import ... 載入;模組級程式僅執行一次,結果快取在 <code>sys.modules</code>。"),
    # 78
    ("Python 的類和對象有什麼區別?",
     "<b>類(class)</b>是物件的藍圖/型別,定義屬性與方法。<br>"
     "<b>物件(object)</b>是依據類別建立的<b>實例</b>,擁有自己的狀態。<br>"
     "<pre>class Cat: ...\nc = Cat()    # c 為 Cat 的實例</pre>"
     "在 Python 中,類本身也是物件(metaclass 的實例)。"),
    # 79
    ("什麼是 Python 類中的 self?",
     "self 是<b>實例方法的第一個參數</b>,代表「呼叫該方法的實例本身」。Python 不會自動傳遞,但透過 <code>instance.method()</code> 語法糖,直譯器會把實例當第一個引數傳入。命名 self 為慣例,可改名但不建議。"),
    # 80
    ("什麼是 Python 的 OOPS(面向對象編程)?",
     "OOP(Object-Oriented Programming)以「物件」為基本單位組織程式,核心特性包含:<br>"
     "<ul>"
     "<li><b>封裝</b>(Encapsulation)</li>"
     "<li><b>繼承</b>(Inheritance)</li>"
     "<li><b>多型</b>(Polymorphism)</li>"
     "<li><b>抽象</b>(Abstraction)</li>"
     "</ul>"
     "Python 支援這些特性,但偏向約定優於強制(無 private/protected 強制等級)。"),
    # 81
    ("什麼是 Python 面向對象的抽象特性?",
     "抽象指<b>只暴露必要介面、隱藏實作細節</b>。Python 透過 <code>abc</code> 模組與 <code>@abstractmethod</code> 定義抽象基底類別(ABC):<br>"
     "<pre>from abc import ABC, abstractmethod\nclass Shape(ABC):\n    @abstractmethod\n    def area(self): ...\nclass Circle(Shape):\n    def area(self): return 3.14*self.r**2</pre>"
     "未實作抽象方法的子類不可被實例化。"),
    # 82
    ("什麼是 Python 面向對象的封裝特性?",
     "把資料與操作該資料的方法包覆在類別中,並控制存取。<br>Python 約定:<br>"
     "<ul>"
     "<li><code>_x</code>:約定為私有/內部。</li>"
     "<li><code>__x</code>:觸發 name mangling,變 <code>_Class__x</code>。</li>"
     "<li><code>@property</code> 提供 getter/setter,實現受控存取。</li>"
     "</ul>"
     "Python 沒有真正的 private,屬「約定式封裝」。"),
    # 83
    ("什麼是 Python 面向對象的多態特性?",
     "<b>同一介面、不同實作</b>。Python 屬鴨子型別,只要實作對應方法即可被使用,不需共同基底。例:不同類別都實作 <code>area()</code>,函式可統一呼叫;<code>+</code> 對數值是相加,對字串/串列是串接。"),
    # 84
    ("Python 是否支持多重繼承?",
     "支援。語法:<code>class C(A, B):</code>。方法解析順序採 <b>C3 線性化(MRO)</b>,可用 <code>C.__mro__</code> 查看。<br>"
     "為避免「菱形繼承」問題,須一致使用 <code>super()</code>。"),
    # 85
    ("為什麼 Python 執行速度慢,如何改進?",
     "原因:解釋執行、動態型別、物件包裝開銷、GIL 限制執行緒並行。<br>"
     "改進方法:<br>"
     "<ul>"
     "<li>選用適合的演算法/資料結構(影響最大)。</li>"
     "<li>使用 NumPy/Pandas 向量化運算。</li>"
     "<li>用 Cython、Numba、mypyc 編譯加速。</li>"
     "<li>呼叫 C 擴充或 ctypes。</li>"
     "<li>多進程(multiprocessing)避開 GIL,I/O 密集任務用 asyncio/threading。</li>"
     "<li>使用 PyPy(JIT)。</li>"
     "<li>profile 後針對熱點優化。</li>"
     "</ul>"),
    # 86
    ("如何分析 Python 代碼的執行性能?",
     "<ul>"
     "<li><b>cProfile / profile</b>:函式級統計,搭配 <code>pstats</code> 排序。</li>"
     "<li><b>timeit</b>:量測小段程式碼。</li>"
     "<li><b>line_profiler</b>:逐行分析(@profile)。</li>"
     "<li><b>memory_profiler、tracemalloc</b>:記憶體分析。</li>"
     "<li><b>py-spy、Scalene、Pyinstrument</b>:採樣式分析器,適合線上服務。</li>"
     "</ul>"),
    # 87
    ("Python 中如何讀取大文件,例如內存只有 4G,如何讀取一個大小為 8G 的文件",
     "重點是<b>分塊/逐行讀取</b>,避免一次載入。<br>"
     "<pre># 逐行(文字)\nwith open('big.txt', encoding='utf-8') as f:\n    for line in f:\n        process(line)\n\n# 定塊(二進位)\nwith open('big.bin', 'rb') as f:\n    while chunk := f.read(8 * 1024 * 1024):\n        process(chunk)</pre>"
     "或使用生成器、mmap、pandas <code>chunksize</code>、Polars 串流模式。"),
    # 88
    ("Python 的 re 模塊中 split()、sub()、subn() 方法有什麼作用?",
     "<ul>"
     "<li><code>re.split(pat, s)</code>:依正則切割,回傳 list。</li>"
     "<li><code>re.sub(pat, repl, s, count=0)</code>:替換,回傳新字串。</li>"
     "<li><code>re.subn(pat, repl, s)</code>:同 sub,但回傳 (新字串, 替換次數)。</li>"
     "</ul>"
     "<pre>re.split(r'\\s+', 'a  b\\tc')   # ['a','b','c']\nre.sub(r'\\d+', '#', 'a1b22')   # 'a#b#'\nre.subn(r'\\d+', '#', 'a1b22')  # ('a#b#', 2)</pre>"),
    # 89
    ("Python 的 namedtuple 有什麼作用?怎麼使用?",
     "<code>collections.namedtuple</code> 建立具名欄位的 tuple,兼具 tuple 的不可變性與類似 class 的可讀性,適合輕量資料載體。<br>"
     "<pre>from collections import namedtuple\nPoint = namedtuple('Point', ['x','y'])\np = Point(1, 2)\np.x, p.y          # 1 2\np._asdict()       # {'x':1,'y':2}\nPoint._fields     # ('x','y')</pre>"
     "現代寫法可改用 <code>dataclass</code> 或 <code>typing.NamedTuple</code>。"),
    # 90
    ("Python 中如何實現多線程?",
     "使用 <code>threading</code> 模組,或更高階的 <code>concurrent.futures.ThreadPoolExecutor</code>。<br>"
     "<pre>import threading\ndef work(x):\n    print(x)\nt = threading.Thread(target=work, args=(1,))\nt.start(); t.join()\n\nfrom concurrent.futures import ThreadPoolExecutor\nwith ThreadPoolExecutor(8) as ex:\n    list(ex.map(work, range(10)))</pre>"
     "受 GIL 影響,CPU 密集任務建議用多進程。"),
    # 91
    ("請介紹 Python 中多線程和多進程的應用場景,以及優缺點?",
     "<b>多執行緒(threading)</b><br>"
     "<ul>"
     "<li>適合 I/O 密集:檔案、網路、資料庫等。</li>"
     "<li>共享記憶體、切換成本低。</li>"
     "<li>缺點:CPython 的 GIL 限制 CPU 密集並行;需處理同步(Lock/Event/Queue)。</li>"
     "</ul>"
     "<b>多行程(multiprocessing)</b><br>"
     "<ul>"
     "<li>適合 CPU 密集:資料壓縮、科學計算。</li>"
     "<li>各行程獨立記憶體、可使用多核。</li>"
     "<li>缺點:啟動/通訊成本較高(IPC、序列化);記憶體開銷大。</li>"
     "</ul>"
     "<b>協程(asyncio)</b>:單執行緒高併發 I/O,最輕量。"),
    # 92
    ("請解釋 Python 線程池的工作原理?",
     "執行緒池預先建立固定數量的工作執行緒,任務透過<b>工作佇列</b>派發:<br>"
     "<ol>"
     "<li><code>submit/map</code> 把任務(callable + 引數)包裝為 Future 放入佇列。</li>"
     "<li>空閒工作執行緒從佇列取任務並執行,結果寫入 Future。</li>"
     "<li>呼叫端透過 <code>future.result()</code> 取得結果或例外。</li>"
     "<li>池關閉時等待現有任務完成(或取消),再回收執行緒。</li>"
     "</ol>"
     "好處:避免頻繁建立/銷毀執行緒、限制併發、統一管理。Python 標準實作為 <code>concurrent.futures.ThreadPoolExecutor</code>。"),
]

assert len(qa) == 92, f"題目數量不符: {len(qa)}"

deck = genanki.Deck(DECK_ID, 'Python 八股文')
for q, a in qa:
    note = genanki.Note(model=model, fields=[q, a])
    deck.add_note(note)

out = r'C:\Users\rudolf\Desktop\新增資料夾\Python八股文.apkg'
genanki.Package(deck).write_to_file(out)
print(f'已輸出: {out}  共 {len(qa)} 張卡片')
