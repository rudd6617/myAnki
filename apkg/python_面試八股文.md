# Python 面試八股文

> 整理自網路常見的 Python 後端工程師面試題，涵蓋語言特性、資料結構、並行處理、記憶體管理、Web 框架等核心主題。

---

## 一、語言基礎

### Q1. Python 是強型別還是弱型別？是動態還是靜態？
**答：** Python 是「動態強型別」語言。
- **動態**：變數型別在執行階段決定，可隨意指向不同型別物件。
- **強型別**：不同型別之間不會自動隱式轉換，例如 `"1" + 1` 會直接拋出 `TypeError`。

### Q2. Python 的 list、tuple、set、dict 的差異？
| 結構 | 有序 | 可變 | 重複 | 可索引 | 表示 |
|------|------|------|------|--------|------|
| list | 是 | 是 | 是 | 是 | `[]` |
| tuple | 是 | 否 | 是 | 是 | `()` |
| set | 否 | 是 | 否 | 否 | `{}` |
| dict | 3.7+ 保序 | 是 | key 不可重複 | 透過 key | `{k:v}` |

### Q3. is 與 == 的差別？
- `is` 比較記憶體位址（`id()`）。
- `==` 比較值（呼叫 `__eq__`）。
- 小整數（-5~256）與短字串會被快取，所以 `a is b` 在這些值上常為 `True`，是實作細節。

### Q4. 可變物件與不可變物件有哪些？
- **不可變**：int、float、bool、str、tuple、frozenset、bytes。
- **可變**：list、dict、set、bytearray、自訂 class（預設）。

### Q5. Python 的參數傳遞是值傳遞還是引用傳遞？
都不是，Python 是「物件引用傳遞」(pass by object reference / call by sharing)。傳遞的是物件的引用：
- 對不可變物件重新賦值不會影響外部變數。
- 對可變物件呼叫 in-place 方法（如 `list.append`）會影響外部。

### Q6. 為什麼預設參數不能用可變物件？
```python
def f(x, lst=[]):  # 反例
    lst.append(x); return lst
```
預設值在函式定義時只建立一次，多次呼叫共用同一物件。應改為 `lst=None`，函式內 `if lst is None: lst = []`。

---

## 二、函式與作用域

### Q7. *args 與 **kwargs 的作用？
- `*args`：將多餘的位置參數打包成 tuple。
- `**kwargs`：將多餘的關鍵字參數打包成 dict。
- 順序：`def f(pos, *args, kw_only, **kwargs)`。

### Q8. 什麼是閉包 (closure)？
內層函式引用外層函式的局部變數，且外層函式回傳該內層函式時，外層變數仍存活，即構成閉包。常用於工廠函式、裝飾器。需修改外層變數時需 `nonlocal`。

### Q9. 解釋裝飾器 (decorator) 與 `@functools.wraps`。
裝飾器是接收一個函式並回傳新函式的高階函式，用於在不修改原始碼的情況下加上行為（記錄、計時、權限）。`@functools.wraps` 用來保留原函式的 `__name__`、`__doc__`、`__wrapped__`。

```python
from functools import wraps
def log(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        print("call", fn.__name__)
        return fn(*a, **kw)
    return wrapper
```

### Q10. LEGB 規則？
名稱解析順序：**Local → Enclosing → Global → Built-in**。

---

## 三、物件導向

### Q11. 新式類別與舊式類別？
Python 3 中所有類別都繼承自 `object`，已無舊式類別之分。多重繼承使用 C3 線性化決定 MRO，可用 `Cls.__mro__` 查看。

### Q12. `__new__` 與 `__init__` 差別？
- `__new__(cls, ...)`：建立並回傳實例（class method），用於控制實例建立、實作單例與不可變類別。
- `__init__(self, ...)`：初始化已建立的實例，無回傳值。

### Q13. classmethod、staticmethod、instance method 差別？
- `instance method`：第一參數 `self`。
- `classmethod`：第一參數 `cls`，可作為替代建構子。
- `staticmethod`：不接收 `self`/`cls`，純粹放在類別命名空間中的函式。

### Q14. `__slots__` 的作用？
透過宣告固定屬性集合，取消 `__dict__`，節省記憶體並加快屬性存取，但失去動態加屬性能力，且不能與多重繼承自由結合。

### Q15. 什麼是元類別 (metaclass)？
類別的類別，用於控制「類別」的建立過程。預設為 `type`。可透過 `class A(metaclass=Meta)` 指定，常用於 ORM 欄位收集、API 註冊等場景。

### Q16. 如何實作單例？
- 使用 metaclass 控制 `__call__`。
- 使用 `__new__` 檢查是否已存在實例。
- 模組層級變數天然單例。
- 裝飾器包裝。

---

## 四、可迭代物件、生成器、協程

### Q17. Iterable、Iterator、Generator 差別？
- **Iterable**：實作 `__iter__()`，可用 for 迴圈遍歷。
- **Iterator**：實作 `__iter__()` 與 `__next__()`，是「狀態機」。
- **Generator**：用 `yield` 編寫的函式或生成器運算式，本身就是 Iterator，惰性求值，省記憶體。

### Q18. yield 與 yield from 差別？
`yield from iterable` 將子生成器扁平化，也代理 `send`/`throw`/`return`，常用於組合協程。

### Q19. asyncio 與多執行緒的差別？
- `asyncio`：單執行緒事件迴圈，利用協程在 IO 阻塞時切換，適合 IO 密集。
- `threading`：受 GIL 影響，CPU 密集無加速；IO 密集可用。
- `multiprocessing`：每個程序獨立直譯器，可繞開 GIL 做 CPU 平行。

### Q20. async/await 怎麼運作？
`async def` 定義協程，呼叫後回傳協程物件而非執行。`await` 將控制權交回事件迴圈，等待可等待物件 (coroutine, Task, Future) 完成後恢復。

---

## 五、GIL 與並行

### Q21. 什麼是 GIL？
CPython 為了簡化記憶體管理（refcount 不需細粒度鎖），用 Global Interpreter Lock 確保任一時刻只有一個執行緒執行 Python bytecode。意味著多執行緒在 CPU 密集任務上無法平行。

### Q22. 如何繞過 GIL？
- 用 `multiprocessing` / `concurrent.futures.ProcessPoolExecutor`。
- 將熱區寫成 C 擴展（`numpy`、`Cython`）並在 C 層釋放 GIL。
- IO 密集任務改用 `asyncio` 或 `threading`，等待 IO 時 GIL 會被釋放。
- 使用無 GIL 的直譯器（如 PyPy STM、CPython 3.13t free-threading）。

### Q23. threading 與 multiprocessing 的選擇原則？
- IO 密集：`threading` / `asyncio`。
- CPU 密集：`multiprocessing` / 子程序 / 平行 C 擴展。

---

## 六、記憶體管理與 GC

### Q24. Python 的垃圾回收機制？
- **以參考計數為主**：每物件有 refcount，歸零即釋放。
- **分代式 GC 處理循環引用**：物件分為三代（0/1/2），新生代頻繁掃描，存活越久進入老代且掃描頻率越低。
- 可用 `gc` 模組手動觸發或關閉。

### Q25. 為什麼會發生記憶體洩漏？
- 全域變數持續累積物件。
- 自定義 `__del__` 與循環引用同時出現會干擾 GC。
- 緩存（`lru_cache`、自寫 dict）未限制大小。
- C 擴展未正確 `Py_DECREF`。

### Q26. 深拷貝與淺拷貝？
- `copy.copy`：淺拷貝，僅拷貝外層容器，內部仍共享。
- `copy.deepcopy`：遞迴拷貝整顆物件圖，會處理循環引用。

---

## 七、模組與套件

### Q27. `__init__.py` 的作用？
- 標記目錄為 Python 套件（Python 3.3 之後支援命名空間套件可不用）。
- 定義套件對外公開的 API（透過 `__all__` 或 re-export）。

### Q28. import 的查找順序？
`sys.modules` 緩存 → 內建模組 → `sys.path`（當前目錄 / `PYTHONPATH` / site-packages）。

### Q29. 解釋 PEP 8、PEP 20。
- **PEP 8**：Python 程式風格指南（縮排、命名、行寬等）。
- **PEP 20**：Zen of Python，設計哲學，可 `import this` 看到。

---

## 八、常見陷阱

### Q30. `==` 與 `is None` 哪個好？
判斷 None 一律使用 `is None` / `is not None`，因為 `None` 是單例，且某些物件覆寫 `__eq__` 後 `== None` 會出錯。

### Q31. for-else / while-else 的語意？
迴圈正常結束（沒被 `break` 中斷）才執行 `else` 區塊。常用於搜尋失敗時的後備邏輯。

### Q32. `==` 兩個浮點數可靠嗎？
不可靠，因為浮點誤差。應改用 `math.isclose(a, b, rel_tol=1e-9, abs_tol=0)`。

### Q33. list comprehension 與 generator expression 差別？
- list comp：`[x for x in it]` 立刻產出整個 list，佔記憶體。
- gen expr：`(x for x in it)` 惰性，逐個產出，更省記憶體。

### Q34. 什麼是鴨子型別 (Duck Typing)？
「If it walks like a duck and quacks like a duck, it's a duck」。Python 不檢查型別，只看物件是否具備所需的方法/屬性。

### Q35. 什麼是 monkey patch？
執行階段修改類別或模組的屬性/方法，常見於測試（mock）或第三方相容性修補。缺點是難以維護與除錯。

---

## 九、Web 與常用套件

### Q36. Django、Flask、FastAPI 的差別？
| 框架 | 風格 | 特色 |
|------|------|------|
| Django | 全家桶 | 內建 ORM、Admin、Auth、Migration |
| Flask | 微框架 | 自由組合擴展，學習曲線低 |
| FastAPI | 非同步 | 基於 Starlette + Pydantic，自動產生 OpenAPI |

### Q37. WSGI 與 ASGI 的差別？
- **WSGI**：同步介面（PEP 3333），如 Gunicorn、uWSGI。
- **ASGI**：非同步介面（支援 WebSocket、HTTP/2、long-polling），如 Uvicorn、Daphne。

### Q38. Django ORM 中 select_related 與 prefetch_related 差別？
- `select_related`：用 SQL JOIN 一次抓回 ForeignKey/OneToOne，適合多對一。
- `prefetch_related`：另發 SQL 查詢再 Python 端 join，適合多對多 / 反向 ForeignKey。

### Q39. 如何避免 N+1 查詢？
- 預先 `select_related` / `prefetch_related`。
- SQL 層 JOIN。
- 使用 dataloader / 批次查詢。

---

## 十、效能與工程實務

### Q40. 如何分析 Python 效能瓶頸？
- `cProfile` + `snakeviz` 視覺化。
- `line_profiler` 逐行分析。
- `memory_profiler` / `tracemalloc` 偵測記憶體。
- `py-spy` 取樣型分析（不需修改程式碼，可線上分析）。

### Q41. 何時應該用 `__slots__`、`dataclass`、`NamedTuple`？
- 大量小物件、追求記憶體 → `__slots__`。
- 需要可變欄位但少量樣板 → `@dataclass(slots=True)`。
- 不可變且要 tuple 解構 → `typing.NamedTuple`。

### Q42. Python 中怎麼實作快取？
- `functools.lru_cache` / `functools.cache` (3.9+)。
- 自訂裝飾器搭配 dict + TTL。
- 外接 Redis/Memcached。

### Q43. `with` statement 背後的協定？
物件實作 `__enter__` 與 `__exit__` 即為 context manager。`contextlib.contextmanager` 可把生成器轉為 context manager。

### Q44. 如何處理大檔案讀取？
- 逐行 `for line in open(path)` 讓檔案物件做 buffered IO。
- 二進位檔以固定 chunk 讀 `f.read(8192)`。
- 大型 CSV 用 `pandas.read_csv(chunksize=)`。

### Q45. 常見的設計模式有哪些？
單例、工廠、抽象工廠、建造者、觀察者、策略、裝飾者、責任鏈、命令、迭代器、模板方法。

---

---

## 十一、型別提示與型別檢查

### Q46. typing 模組常見型別？
- 基本：`Optional[X]` (= `X | None`)、`Union[X, Y]` (3.10+ 改 `X | Y`)、`Any`、`Literal['a', 'b']`。
- 容器：`List[int]`、`Dict[str, int]`、`Tuple[int, str]`、`Iterable[T]`、`Sequence[T]`。
- 泛型：`TypeVar('T')`、`Generic[T]`、`ParamSpec`、`Concatenate`。
- 進階：`Protocol`（結構化型別）、`TypedDict`、`Annotated`、`Final`、`ClassVar`、`Self` (3.11+)。

### Q47. mypy / pyright / pyre 差別？
- `mypy`：官方背書，較嚴謹但較慢。
- `pyright`：微軟，以 TS-like 速度著稱，VSCode Pylance 內建。
- `pyre`：Meta 出品，著重大型專案與安全分析。
- 三者規則略有差異，可依團隊習慣選擇。

### Q48. Protocol（結構化子型別）跟 ABC 差別？
- ABC：名義上繼承（必須 `class X(MyABC)`）。
- Protocol：鴨子型別 + 靜態檢查；任何具備該方法集合的類別都「實作」此 Protocol，不需顯式繼承。

### Q49. 為什麼會有 `from __future__ import annotations`？
讓所有註解以字串 (lazy) 處理，避免循環匯入與未定義名稱問題；3.11 之後 PEP 563 預設行為仍未改，保留這行可保險。

---

## 十二、測試與品質

### Q50. unittest、pytest、nose 比較？
- `unittest`：標準函式庫，xUnit 風格。
- `pytest`：使用簡潔 assert、強大 fixture 與 plugin 生態，業界主流。
- `nose` / `nose2`：早期方案，現已不活躍。

### Q51. fixture 的 scope？
`function`（預設）、`class`、`module`、`package`、`session`。scope 越大，初始化次數越少，但要注意共享狀態。

### Q52. 如何 mock 一個外部 API？
```python
from unittest.mock import patch
@patch("mypkg.client.requests.get")
def test_call(mock_get):
    mock_get.return_value.json.return_value = {"ok": True}
    assert fetch() == {"ok": True}
```
注意 patch 的目標必須是「使用該名稱的命名空間」，而非原始定義位置。

### Q53. tox 與 nox 的用途？
建立隔離虛擬環境，跨多個 Python 版本/相依組合執行測試。`nox` 用 Python 設定檔，較靈活；`tox` 用 ini 設定，歷史較久。

### Q54. 程式品質工具有哪些？
- 格式化：`black`、`ruff format`。
- Linter：`flake8`、`pylint`、`ruff`（速度快、規則多）。
- 型別：`mypy`、`pyright`。
- 安全：`bandit`、`pip-audit`。
- 預先提交：`pre-commit` 框架。

---

## 十三、Packaging 與部署

### Q55. setuptools、Poetry、Hatch、PDM 差別？
- `setuptools` + `setup.py / pyproject.toml`：傳統，最廣相容。
- `Poetry`：相依鎖定 + 打包，使用直觀。
- `Hatch`：PyPA 推薦，整合環境/版本/打包。
- `PDM`：實作 PEP 582 (`__pypackages__`)。

### Q56. wheel 與 sdist 差別？
- `sdist` (`*.tar.gz`)：原始碼分發，安裝時可能需要編譯。
- `wheel` (`*.whl`)：預先打包好的二進位格式，`pip install` 不需編譯，速度快。

### Q57. 虛擬環境工具差別？
`venv`（標準函式庫）、`virtualenv`（前者前身、相容性更廣）、`conda`（含原生套件、跨語言）、`pipenv`（lockfile 管理，已較少用）。

### Q58. PEP 517/518 解決什麼？
定義 `pyproject.toml` + `[build-system]`，將「建置工具」與「相依管理」標準化，不再強迫使用 `setup.py`。

---

## 十四、安全與常見陷阱

### Q59. pickle 為什麼不安全？
反序列化會執行任意程式碼，攻擊者可構造惡意 payload。建議：
- 不要載入不信任來源的 pickle。
- 改用 JSON、msgpack、Protobuf。
- 必要時加 HMAC 驗章。

### Q60. eval / exec 的風險？
任意字串會被執行；若包含使用者輸入會有 RCE。替代方案：`ast.literal_eval`（只解析字面值）、解析器函式庫。

### Q61. 為什麼 hashlib 比 hash() 安全？
- 內建 `hash()` 用於字典 key、會被加 salt（PYTHONHASHSEED），不可重現也不能用作密碼學雜湊。
- 加密用途必須用 `hashlib`（SHA-256 / BLAKE2）甚至 `hashlib.scrypt`、`bcrypt`、`argon2` 做密碼雜湊。

### Q62. SSRF / Path Traversal / Command Injection 怎麼防？
- 嚴格白名單驗證。
- `subprocess` 不要 `shell=True`，傳 list 形式參數。
- `os.path.realpath` + 與允許目錄比對防止 `..` 跳脫。

---

## 十五、進階語言特性

### Q63. 描述器 (descriptor) 是什麼？
實作 `__get__` / `__set__` / `__delete__` 之一的物件即為描述器，控制屬性存取。`property`、`classmethod`、`staticmethod`、ORM Field 都是描述器的應用。

### Q64. 抽象基底類別 (ABC) 怎麼用？
```python
from abc import ABC, abstractmethod
class Repo(ABC):
    @abstractmethod
    def save(self, item): ...
```
繼承後若未實作所有 abstract 方法，無法實例化。

### Q65. dataclass 和 NamedTuple 差別？
- `dataclass`：可變、繼承靈活、可加 `__post_init__`、`field(default_factory=...)`。
- `NamedTuple`：不可變、可解構為 tuple、輕量。
- `@dataclass(frozen=True, slots=True)` 可達到接近 NamedTuple 的不可變 + 省記憶體。

### Q66. PEP 695 (3.12) 的型別語法新增？
```python
type Vector = list[float]
def first[T](items: list[T]) -> T: ...
class Stack[T]: ...
```
更接近 TypeScript 風格的泛型語法。

### Q67. match / case (PEP 634) 與 switch 的差別？
- 不只比對字面值，還支援結構化模式：`case Point(x=0, y=y)`、`case [first, *rest]`、`case {"name": str() as n}`、`case _ if cond`。
- 重點在「解構」與「型別比對」，比 switch 強大但也容易誤用為 if-else。

### Q68. 為什麼 `import *` 不建議使用？
- 污染命名空間，難以追蹤名稱來源。
- 若模組更新導出，可能無聲覆寫既有名稱。
- `__all__` 雖可控制但仍不直觀。

### Q69. 何時用 `__init_subclass__` vs metaclass？
`__init_subclass__` 在 Python 3.6 引入，能處理大多 metaclass 用途（子類別註冊、欄位收集），語法簡單，建議優先；只在需要控制實例建立流程或多繼承衝突時才回到 metaclass。

### Q70. asyncio Task、Future、Coroutine 差別？
- Coroutine：呼叫 `async def` 回傳的物件，未排程。
- Task：被排程的 coroutine（由事件迴圈執行），Future 的子類。
- Future：低階可等待物件，代表尚未完成的結果。

---

## 參考來源
- [面試題 - HackMD](https://hackmd.io/@_FqBW8dGS8a5ZqhdMwvpuA/ByYoWaxfD)
- [Python 八股文系列：100 個 Python 面試/筆試高頻考點 - CSDN](https://blog.csdn.net/qq_37085158/article/details/126821933)
- [面試八股文-Python 基礎 - CSDN](https://blog.csdn.net/qq_38992249/article/details/119968248)
- [GitHub - clown-0726/python-8-part-essay](https://github.com/clown-0726/python-8-part-essay)
- [Python 常考面試題彙總（附答案） - 掘金](https://juejin.cn/post/6978409487472263175)
- [110 道 Python 面試題（真題） - 知乎](https://zhuanlan.zhihu.com/p/54430650)
