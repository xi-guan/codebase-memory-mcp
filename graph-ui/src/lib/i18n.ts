import { useEffect, useState } from "react";

export type UiLanguage = "en" | "zh";

export const messages = {
  en: {
    tabs: {
      graph: "Graph",
      projects: "Projects",
      control: "Control",
    },
    common: {
      cancel: "Cancel",
      refresh: "Refresh",
      loading: "Loading...",
      save: "Save",
      saving: "Saving...",
      delete: "Delete",
      noMatches: "No matches",
      dismiss: "Dismiss",
      all: "All",
      none: "None",
      close: "Close",
      reset: "Reset",
    },
    topBar: {
      selectProjectFirst: "Select a project first",
      switchProject: "Switch project",
      allProjects: (count: number) => `All ${count} projects →`,
      light: "Light",
      dark: "Dark",
      theme: "Theme",
    },
    graph: {
      selectedLabel: "Graph",
      search: "Search loaded nodes",
      clearSelection: "Clear selection",
      escHint: "esc",
      folders: "Folders",
      nodeTypes: "Node types",
      missedFiles: "Missed files",
      showMissedSkeleton: "Show missed skeleton",
      missedExplainer:
        "Hollow white satellite = not fully indexed. Click to focus, click the galaxy to return.",
      missedNone: "No known misses (best-effort — not a completeness guarantee).",
      deadCode: "Dead code",
      deadCount: (count: string) => `${count} dead`,
      colorByStatus: "Colour by status",
      showOnlyDead: "Show only dead code",
      hideEntryPoints: "Hide entry points",
      hideTests: "Hide tests",
      showLabels: "Show labels",
      nodesCount: (count: string) => `${count} nodes`,
      edgesCount: (count: string) => `${count} edges`,
      showingOf: (shown: string, total: string) => `showing ${shown} of ${total}`,
      raiseBudget: "raise budget",
      selection: (total: number, neighbours: number) =>
        `${total.toLocaleString()} selected · 1 focus + ${neighbours.toLocaleString()} ${
          neighbours === 1 ? "neighbour" : "neighbours"
        }`,
      canvasHint: "drag to orbit · scroll to zoom · click a node for detail",
      budgetLabel: "nodes",
      budgetHelp:
        "How many nodes to load (5,000 steps, edges between loaded nodes follow automatically)",
      display: "Display",
      displaySettings: "Display settings",
      contrast: "Contrast",
      edgeBrightness: "Edge brightness",
      edgeBrightnessHint: "Dim the web of links on dense graphs",
      nodeGlow: "Node glow",
      nodeGlowHint: "Halo boost around each node",
      bloom: "Bloom",
      bloomHint: "Overall glow bloom strength",
      displayFootnote:
        "1.00× follows automatic density compensation. Lower these when a large graph washes out.",
      selectProject: "Select a project from the Projects tab",
      noNodes: "No nodes in this project",
      allFilteredOut: "All nodes filtered out",
      resetFilters: "Reset Filters",
      retry: "Retry",
      receivingGraph: "Receiving graph",
      computingLayout: "Computing layout",
      upToNodes: (count: string) => `up to ${count} nodes`,
    },
    detail: {
      out: "Out",
      in: "In",
      total: "Total",
      showSource: "Show source",
      hideSource: "Hide source",
      lines: (count: string) => `${count} lines`,
      references: "References",
      referencedBy: "Referenced by",
      moreReferences: (count: string) => `+ ${count} more references`,
      noConnections: "No connections",
      openOnGitHub: "Open on GitHub",
    },
    projects: {
      indexedProjects: "Indexed Projects",
      repositories: (count: number) =>
        `${count} ${count === 1 ? "repository" : "repositories"}`,
      totals: (nodes: string, edges: string) => `${nodes} nodes · ${edges} edges`,
      allProjects: "All projects",
      recentlyOpened: "Recently opened",
      rowFootnote: "Whole row opens the graph · hover for ADR and remove",
      noIndexedProjects: "No indexed projects",
      indexFirstRepository: "Index your first repository",
      viewGraph: "View graph",
      addAdr: "+ ADR",
      nodes: "nodes",
      edges: "edges",
      nodeCount: (count: string) => `${count} nodes`,
      deleteTitle: "Delete index",
      deleteConfirm: (name: string) => `Delete index for "${name}"?`,
      healthHealthy: "Database healthy",
      healthMissing: "Database missing",
      healthCorrupt: "Database unhealthy",
      healthChecking: "Checking...",
      indexingInProgress: "Indexing in progress",
      indexingFailed: "Indexing failed",
      justNow: "just now",
      minutesAgo: (n: number) => `${n}m ago`,
      hoursAgo: (n: number) => `${n}h ago`,
      daysAgo: (n: number) => `${n}d ago`,
    },
    index: {
      newIndex: "New Index",
      selectRepositoryFolder: "Select repository folder",
      instructions:
        "Navigate to the project root, then index it. The folder name becomes the project id unless you set one.",
      repositoryPath: "Repository path",
      projectName: "Project id · permanent",
      projectNamePlaceholder: "derived from folder",
      projectNameHelp:
        "Becomes the database name and query prefix. Leave blank to derive it from the path.",
      filterFolders: "Filter folders",
      noSubdirectories: "No subdirectories",
      indexThisFolder: "Index this folder",
      indexChip: "index",
      willIndex: (path: string) => `will index ${path}`,
      starting: "Starting...",
      browseRoot: (path: string) => `Browse ${path}`,
      indexDirectory: (name: string) => `Index ${name}`,
      goUp: "Go up",
    },
    adr: {
      title: "Architecture Decision Record",
      lastUpdated: "Last updated",
    },
    control: {
      panel: "Daemon",
      status: (pid: string, uptime: string) => `running · pid ${pid} · up ${uptime}`,
      stopped: "no daemon process found",
      totalCpu: "Total CPU",
      totalRam: "Total RAM",
      processes: "Processes",
      selfRam: "Self RAM",
      activeProcesses: "Active processes",
      processLogs: "Process logs",
      logLines: (count: string) => `${count} lines`,
      noProcesses: "No processes found",
      noLogs: "No logs yet",
      thisProcess: "THIS",
      uptime: "Uptime",
      pid: "PID",
      command: "Command",
    },
  },
  zh: {
    tabs: {
      graph: "图谱",
      projects: "项目",
      control: "控制",
    },
    common: {
      cancel: "取消",
      refresh: "刷新",
      loading: "加载中...",
      save: "保存",
      saving: "保存中...",
      delete: "删除",
      noMatches: "无匹配结果",
      dismiss: "关闭",
      all: "全选",
      none: "全不选",
      close: "关闭",
      reset: "重置",
    },
    topBar: {
      selectProjectFirst: "请先选择项目",
      switchProject: "切换项目",
      allProjects: (count: number) => `全部 ${count} 个项目 →`,
      light: "浅色",
      dark: "深色",
      theme: "主题",
    },
    graph: {
      selectedLabel: "图谱",
      search: "搜索已加载节点",
      clearSelection: "清除选择",
      escHint: "esc",
      folders: "目录",
      nodeTypes: "节点类型",
      missedFiles: "未覆盖文件",
      showMissedSkeleton: "显示未覆盖骨架",
      missedExplainer: "空心白色卫星 = 未完全索引。点击聚焦，点击星系返回。",
      missedNone: "未发现遗漏（尽力检测，不保证完整）。",
      deadCode: "死代码",
      deadCount: (count: string) => `${count} 个死代码`,
      colorByStatus: "按状态着色",
      showOnlyDead: "仅显示死代码",
      hideEntryPoints: "隐藏入口点",
      hideTests: "隐藏测试",
      showLabels: "显示标签",
      nodesCount: (count: string) => `${count} 节点`,
      edgesCount: (count: string) => `${count} 边`,
      showingOf: (shown: string, total: string) => `显示 ${shown} / ${total}`,
      raiseBudget: "提高上限",
      selection: (total: number, neighbours: number) =>
        `已选 ${total.toLocaleString()} · 1 焦点 + ${neighbours.toLocaleString()} 邻居`,
      canvasHint: "拖动旋转 · 滚轮缩放 · 点击节点查看详情",
      budgetLabel: "节点",
      budgetHelp: "加载多少节点（每档 5,000，已加载节点之间的边自动跟随）",
      display: "显示",
      displaySettings: "显示设置",
      contrast: "对比度",
      edgeBrightness: "边亮度",
      edgeBrightnessHint: "在密集图中调暗连线",
      nodeGlow: "节点光晕",
      nodeGlowHint: "每个节点周围的光晕强度",
      bloom: "泛光",
      bloomHint: "整体泛光强度",
      displayFootnote: "1.00× 表示自动密度补偿。大图发白时调低这几项。",
      selectProject: "请从项目页选择一个项目",
      noNodes: "该项目没有节点",
      allFilteredOut: "所有节点已被过滤",
      resetFilters: "重置过滤器",
      retry: "重试",
      receivingGraph: "接收图数据",
      computingLayout: "计算布局",
      upToNodes: (count: string) => `最多 ${count} 个节点`,
    },
    detail: {
      out: "出",
      in: "入",
      total: "合计",
      showSource: "显示源码",
      hideSource: "隐藏源码",
      lines: (count: string) => `${count} 行`,
      references: "引用",
      referencedBy: "被引用",
      moreReferences: (count: string) => `+ 还有 ${count} 条引用`,
      noConnections: "无连接",
      openOnGitHub: "在 GitHub 打开",
    },
    projects: {
      indexedProjects: "已索引项目",
      repositories: (count: number) => `${count} 个仓库`,
      totals: (nodes: string, edges: string) => `${nodes} 节点 · ${edges} 边`,
      allProjects: "全部项目",
      recentlyOpened: "最近打开",
      rowFootnote: "整行打开图谱 · 悬停显示 ADR 与删除",
      noIndexedProjects: "暂无已索引项目",
      indexFirstRepository: "索引第一个仓库",
      viewGraph: "查看图谱",
      addAdr: "+ ADR",
      nodes: "节点",
      edges: "边",
      nodeCount: (count: string) => `${count} 节点`,
      deleteTitle: "删除索引",
      deleteConfirm: (name: string) => `删除 "${name}" 的索引？`,
      healthHealthy: "数据库正常",
      healthMissing: "数据库缺失",
      healthCorrupt: "数据库异常",
      healthChecking: "检查中...",
      indexingInProgress: "正在索引",
      indexingFailed: "索引失败",
      justNow: "刚刚",
      minutesAgo: (n: number) => `${n} 分钟前`,
      hoursAgo: (n: number) => `${n} 小时前`,
      daysAgo: (n: number) => `${n} 天前`,
    },
    index: {
      newIndex: "新建索引",
      selectRepositoryFolder: "选择仓库目录",
      instructions: "导航到项目根目录后索引它。未填写项目 id 时用目录名。",
      repositoryPath: "仓库路径",
      projectName: "项目 id · 永久",
      projectNamePlaceholder: "留空则用目录名",
      projectNameHelp: "将作为数据库名称与查询前缀；留空则从路径派生。",
      filterFolders: "筛选目录",
      noSubdirectories: "没有子目录",
      indexThisFolder: "索引此目录",
      indexChip: "索引",
      willIndex: (path: string) => `将索引 ${path}`,
      starting: "启动中...",
      browseRoot: (path: string) => `浏览 ${path}`,
      indexDirectory: (name: string) => `索引 ${name}`,
      goUp: "返回上级",
    },
    adr: {
      title: "架构决策记录",
      lastUpdated: "最后更新",
    },
    control: {
      panel: "守护进程",
      status: (pid: string, uptime: string) =>
        `运行中 · pid ${pid} · 已运行 ${uptime}`,
      stopped: "未找到守护进程",
      totalCpu: "总 CPU",
      totalRam: "总内存",
      processes: "进程",
      selfRam: "自身内存",
      activeProcesses: "活动进程",
      processLogs: "进程日志",
      logLines: (count: string) => `${count} 行`,
      noProcesses: "未找到进程",
      noLogs: "暂无日志",
      thisProcess: "本进程",
      uptime: "运行时间",
      pid: "PID",
      command: "命令",
    },
  },
} as const;

export type UiMessages = (typeof messages)[UiLanguage];

export function detectLanguage(acceptLanguage?: string | null, override?: string | null): UiLanguage {
  if (override === "zh" || override === "en") return override;
  if (!acceptLanguage) return "en";

  // Ranked by q, not by whether "zh" appears anywhere. A substring test served
  // Chinese for "en-US,en;q=0.9,zh;q=0.5", where English is clearly preferred,
  // and for "zh;q=0, en", where q=0 means Chinese is unacceptable.
  const best = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => /^\s*q\s*=\s*([\d.]+)\s*$/i.exec(p)).find(Boolean);
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q[1]) : 1 };
    })
    .filter(({ tag, q }) => tag && Number.isFinite(q) && q > 0)
    .sort((a, b) => b.q - a.q)
    .find(({ tag }) => tag.split("-")[0] === "zh" || tag.split("-")[0] === "en");

  return best?.tag.startsWith("zh") ? "zh" : "en";
}

let cachedLanguage: UiLanguage = "en";
let languageLoaded = false;
let languageRequest: Promise<UiLanguage> | null = null;
const languageListeners = new Set<(lang: UiLanguage) => void>();

function loadUiLanguage(): Promise<UiLanguage> {
  if (languageLoaded) return Promise.resolve(cachedLanguage);
  if (languageRequest) return languageRequest;

  languageRequest = fetch("/api/ui-config")
    .then((r) => r.json())
    .then((data) => detectLanguage(null, data?.lang))
    .catch(() => detectLanguage(navigator.language))
    .then((lang) => {
      cachedLanguage = lang;
      languageLoaded = true;
      for (const listener of languageListeners) listener(lang);
      return lang;
    })
    .finally(() => {
      languageRequest = null;
    });

  return languageRequest;
}

export function useUiMessages(): UiMessages {
  const [lang, setLang] = useState<UiLanguage>(cachedLanguage);

  useEffect(() => {
    let cancelled = false;
    languageListeners.add(setLang);
    void loadUiLanguage().then((nextLang) => {
      if (!cancelled) setLang(nextLang);
    });
    return () => {
      cancelled = true;
      languageListeners.delete(setLang);
    };
  }, []);

  return messages[lang];
}
