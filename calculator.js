/**
 * ==========================================================
 * 数据区：负责状态存储、历史记录读写、持久化管理
 * ==========================================================
 */

/**
 * 历史记录在 localStorage 中保存时使用的 key。
 * 统一管理 key，后续如果要更名，只改这一处即可。
 */
const HISTORY_STORAGE_KEY = "calculator_history_records_v1";

/**
 * 全局状态对象：统一保存页面运行时所需数据。
 * - currentInput: 当前正在输入的数字字符串（支持小数）
 * - previousValue: 上一次确认的数字（用于双目运算）
 * - operator: 当前运算符（+ - * /）
 * - waitingForNextOperand: 是否等待下一个数字输入
 * - history: 历史记录数组
 * - historyKeyword: 历史查询关键字
 */
const state = {
  currentInput: "0",
  previousValue: null,
  operator: null,
  waitingForNextOperand: false,
  history: [],
  historyKeyword: "",
};

/**
 * 从 localStorage 读取历史记录并写入状态。
 * 异常情况下不抛错，直接回退为空数组，保证应用可继续使用。
 */
function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    state.history = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.history)) {
      state.history = [];
    }
  } catch (error) {
    state.history = [];
  }
}

/**
 * 将当前状态中的历史记录写回 localStorage。
 * 每次新增或清空历史后都应调用，避免页面刷新后数据丢失。
 */
function saveHistoryToStorage() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history));
}

/**
 * 新增一条历史记录到内存，并同步持久化。
 * @param {Object} record - 单条计算记录对象
 */
function appendHistoryRecord(record) {
  state.history.unshift(record);
  saveHistoryToStorage();
}

/**
 * 清空内存中的全部历史记录，并同步到 localStorage。
 * 用于“清空记录”按钮。
 */
function clearAllHistory() {
  state.history = [];
  saveHistoryToStorage();
}

/**
 * ==========================================================
 * 工具函数区：纯逻辑函数，不直接操作 DOM
 * ==========================================================
 */

/**
 * 判断当前字符是否为有效运算符。
 * @param {string} value - 待判断字符
 * @returns {boolean} 是否为 + - * /
 */
function isOperator(value) {
  return ["+", "-", "*", "/"].includes(value);
}

/**
 * 将字符串安全转换为数字。
 * @param {string} value - 数字字符串
 * @returns {number} 转换后的数字（非法时返回 NaN）
 */
function toNumber(value) {
  return Number.parseFloat(value);
}

/**
 * 计算两个数字的四则运算结果。
 * @param {number} left - 左操作数
 * @param {number} right - 右操作数
 * @param {string} operator - 运算符
 * @returns {number} 计算结果
 */
function calculate(left, right, operator) {
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  if (operator === "*") return left * right;
  if (operator === "/") return left / right;
  return right;
}

/**
 * 对数字结果进行展示格式化，避免出现过长的小数串。
 * @param {number} value - 待格式化数字
 * @returns {string} 适合展示的字符串
 */
function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "错误";
  }

  // 保留最多 12 位有效数字，兼顾小数计算显示
  const normalized = Number.parseFloat(value.toPrecision(12));
  return String(normalized);
}

/**
 * 生成当前计算表达式文本，用于渲染顶部表达式区域。
 * @returns {string} 例如 "12.5 + 3.2"
 */
function buildExpressionText() {
  if (!state.operator) {
    return state.currentInput;
  }

  const left = state.previousValue ?? 0;
  return `${left} ${state.operator} ${state.currentInput}`;
}

/**
 * 创建一条历史记录对象。
 * @param {string} expression - 完整表达式
 * @param {string} result - 计算结果字符串
 * @returns {{id: string, expression: string, result: string, time: string}}
 */
function createHistoryRecord(expression, result) {
  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    expression,
    result,
    time: new Date().toLocaleString(),
  };
}

/**
 * 根据关键字过滤历史记录。
 * 可匹配表达式、结果、时间，满足“往期查询”能力。
 * @param {Array} history - 原始历史记录
 * @param {string} keyword - 查询关键字
 * @returns {Array} 过滤后的结果
 */
function filterHistory(history, keyword) {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return history;

  return history.filter((item) => {
    return (
      item.expression.toLowerCase().includes(trimmed) ||
      item.result.toLowerCase().includes(trimmed) ||
      item.time.toLowerCase().includes(trimmed)
    );
  });
}

/**
 * ==========================================================
 * 渲染区：仅负责把状态渲染到页面，不改业务状态
 * ==========================================================
 */

/**
 * DOM 缓存对象：统一收集页面节点，避免重复查询。
 */
const view = {
  expressionEl: null,
  resultEl: null,
  keypadEl: null,
  historySearchEl: null,
  clearHistoryBtnEl: null,
  historyListEl: null,
};

/**
 * 初始化 DOM 引用缓存。
 * 在应用启动时执行一次。
 */
function initViewElements() {
  view.expressionEl = document.getElementById("expression");
  view.resultEl = document.getElementById("result");
  view.keypadEl = document.getElementById("keypad");
  view.historySearchEl = document.getElementById("historySearch");
  view.clearHistoryBtnEl = document.getElementById("clearHistoryBtn");
  view.historyListEl = document.getElementById("historyList");
}

/**
 * 渲染顶部表达式与结果显示区。
 * 该函数只读取 state，不做业务计算。
 */
function renderDisplay() {
  view.expressionEl.textContent = buildExpressionText();
  view.resultEl.textContent = state.currentInput;
}

/**
 * 创建单条历史记录的 DOM 节点。
 * @param {Object} item - 单条记录
 * @returns {HTMLLIElement} 渲染好的列表项
 */
function createHistoryItemElement(item) {
  const li = document.createElement("li");
  li.className = "history-item";
  li.innerHTML = `
    <small>${item.time}</small>
    <span>${item.expression}</span>
    <strong>= ${item.result}</strong>
  `;
  return li;
}

/**
 * 渲染历史记录列表（支持根据关键字过滤后的结果展示）。
 */
function renderHistoryList() {
  const filtered = filterHistory(state.history, state.historyKeyword);
  view.historyListEl.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "暂无匹配记录";
    view.historyListEl.appendChild(empty);
    return;
  }

  filtered.forEach((item) => {
    view.historyListEl.appendChild(createHistoryItemElement(item));
  });
}

/**
 * 统一渲染入口：当状态变化后调用一次即可刷新整个界面。
 */
function renderAll() {
  renderDisplay();
  renderHistoryList();
}

/**
 * ==========================================================
 * 页面操作区：负责事件绑定、输入处理、状态变更流程
 * ==========================================================
 */

/**
 * 处理数字按钮输入。
 * @param {string} digit - 按下的数字字符
 */
function handleNumberInput(digit) {
  if (state.waitingForNextOperand) {
    state.currentInput = digit;
    state.waitingForNextOperand = false;
    return;
  }

  if (state.currentInput === "0") {
    state.currentInput = digit;
    return;
  }

  state.currentInput += digit;
}

/**
 * 处理小数点输入，保证同一个数字只允许一个小数点。
 */
function handleDecimalInput() {
  if (state.waitingForNextOperand) {
    state.currentInput = "0.";
    state.waitingForNextOperand = false;
    return;
  }

  if (!state.currentInput.includes(".")) {
    state.currentInput += ".";
  }
}

/**
 * 处理运算符输入。
 * 逻辑：
 * 1) 第一次输入运算符：保存当前值到 previousValue
 * 2) 连续输入运算符：允许替换运算符
 * 3) 已有 previousValue 且已输入右值：先计算，再继续链式运算
 * @param {string} nextOperator - 新输入运算符
 */
function handleOperatorInput(nextOperator) {
  if (!isOperator(nextOperator)) return;

  const inputValue = toNumber(state.currentInput);

  if (state.previousValue === null || state.previousValue === undefined) {
    state.previousValue = inputValue;
  } else if (!state.waitingForNextOperand && state.operator) {
    const calculated = calculate(state.previousValue, inputValue, state.operator);
    const formatted = formatNumber(calculated);
    state.currentInput = formatted;
    state.previousValue = toNumber(formatted);
  }

  state.operator = nextOperator;
  state.waitingForNextOperand = true;
}

/**
 * 处理等号输入并写入历史记录。
 * 满足有运算符和左右值时才执行计算。
 */
function handleEqualInput() {
  if (!state.operator || state.previousValue === null || state.waitingForNextOperand) {
    return;
  }

  const left = state.previousValue;
  const right = toNumber(state.currentInput);
  const expression = `${left} ${state.operator} ${right}`;
  const resultValue = calculate(left, right, state.operator);
  const resultText = formatNumber(resultValue);

  state.currentInput = resultText;
  state.previousValue = null;
  state.operator = null;
  state.waitingForNextOperand = false;

  const record = createHistoryRecord(expression, resultText);
  appendHistoryRecord(record);
}

/**
 * 处理删除（DEL）操作：删除当前输入最后一位字符。
 */
function handleDeleteInput() {
  if (state.waitingForNextOperand) {
    return;
  }

  if (state.currentInput.length <= 1) {
    state.currentInput = "0";
    return;
  }

  state.currentInput = state.currentInput.slice(0, -1);
}

/**
 * 处理清空（AC）操作：重置当前计算流程，不影响历史记录。
 */
function handleClearCurrent() {
  state.currentInput = "0";
  state.previousValue = null;
  state.operator = null;
  state.waitingForNextOperand = false;
}

/**
 * 处理历史查询输入框变化。
 * 每次输入都实时更新关键词并触发重渲染。
 * @param {Event} event - input 事件对象
 */
function handleHistorySearch(event) {
  state.historyKeyword = event.target.value || "";
  renderHistoryList();
}

/**
 * 处理“清空记录”按钮操作。
 * 只清空历史，不影响正在计算的值。
 */
function handleClearHistoryClick() {
  clearAllHistory();
  renderHistoryList();
}

/**
 * 键盘区点击事件分发器。
 * 通过 data-action 路由到不同处理函数，避免把所有逻辑堆在一个点击函数内。
 * @param {MouseEvent} event - 点击事件对象
 */
function handleKeypadClick(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action === "number") handleNumberInput(value);
  if (action === "decimal") handleDecimalInput();
  if (action === "operator") handleOperatorInput(value);
  if (action === "equal") handleEqualInput();
  if (action === "delete") handleDeleteInput();
  if (action === "clear") handleClearCurrent();

  renderDisplay();
}

/**
 * 绑定页面事件。
 * 统一集中注册，后续维护时容易排查。
 */
function bindEvents() {
  view.keypadEl.addEventListener("click", handleKeypadClick);
  view.historySearchEl.addEventListener("input", handleHistorySearch);
  view.clearHistoryBtnEl.addEventListener("click", handleClearHistoryClick);
}

/**
 * 应用启动函数：
 * 1) 初始化视图引用
 * 2) 加载历史记录
 * 3) 绑定事件
 * 4) 首次渲染
 */
function initApp() {
  initViewElements();
  loadHistoryFromStorage();
  bindEvents();
  renderAll();
}

initApp();
