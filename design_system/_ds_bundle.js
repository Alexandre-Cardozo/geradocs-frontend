/* @ds-bundle: {"format":4,"namespace":"GovProGeraDocsDesignSystem_11bcef","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"Toggle","sourcePath":"components/actions/Toggle.jsx"},{"name":"Header","sourcePath":"components/chrome/Header.jsx"},{"name":"Sidebar","sourcePath":"components/chrome/Sidebar.jsx"},{"name":"DocPill","sourcePath":"components/feedback/DocPill.jsx"},{"name":"Tag","sourcePath":"components/feedback/DocPill.jsx"},{"name":"StatCard","sourcePath":"components/feedback/StatCard.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/StatCard.jsx"},{"name":"StatusBadge","sourcePath":"components/feedback/StatusBadge.jsx"},{"name":"ValidationMsg","sourcePath":"components/feedback/ValidationMsg.jsx"},{"name":"InfoBanner","sourcePath":"components/feedback/ValidationMsg.jsx"},{"name":"ChoiceCard","sourcePath":"components/forms/ChoiceCard.jsx"},{"name":"CheckMark","sourcePath":"components/forms/ChoiceCard.jsx"},{"name":"FileUpload","sourcePath":"components/forms/FileUpload.jsx"},{"name":"FormField","sourcePath":"components/forms/FormField.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Textarea","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Input.jsx"},{"name":"SearchInput","sourcePath":"components/forms/SearchInput.jsx"},{"name":"FilterTabs","sourcePath":"components/forms/SearchInput.jsx"},{"name":"SectionBlock","sourcePath":"components/navigation/SectionBlock.jsx"},{"name":"CardPanel","sourcePath":"components/navigation/SectionBlock.jsx"},{"name":"StepIndicator","sourcePath":"components/navigation/StepIndicator.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"671fada2ca2a","components/actions/Toggle.jsx":"e7637a4616e7","components/chrome/Header.jsx":"18da28b91106","components/chrome/Sidebar.jsx":"6f20d520b5a6","components/feedback/DocPill.jsx":"cc56444b14c7","components/feedback/StatCard.jsx":"7d762ba25409","components/feedback/StatusBadge.jsx":"126872d81c1c","components/feedback/ValidationMsg.jsx":"14f5bc7278ea","components/forms/ChoiceCard.jsx":"64aca7d6af40","components/forms/FileUpload.jsx":"29c79abfc39b","components/forms/FormField.jsx":"bc994c77c551","components/forms/Input.jsx":"eac330198d1b","components/forms/SearchInput.jsx":"1a619d6b3ce0","components/navigation/SectionBlock.jsx":"8d410530095b","components/navigation/StepIndicator.jsx":"2adda7ec1d72","ui_kits/geradocs/DashboardScreen.jsx":"db591953ea7b","ui_kits/geradocs/ETPFormScreen.jsx":"70f1ee7c0106","ui_kits/geradocs/NewProcessScreen.jsx":"09e719520698","ui_kits/geradocs/ProcessListScreen.jsx":"40ca161e8178"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GovProGeraDocsDesignSystem_11bcef = window.GovProGeraDocsDesignSystem_11bcef || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/** Primary/secondary/dark/success action button. Values lifted from prototype. */
function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  disabled,
  style,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    transition: "var(--transition-fast)",
    whiteSpace: "nowrap"
  };
  const sizes = {
    sm: {
      padding: "0 14px",
      height: 32,
      fontSize: 13
    },
    md: {
      padding: "0 16px",
      height: 36,
      fontSize: 13
    },
    lg: {
      padding: "0 20px",
      height: 40,
      fontSize: 14
    }
  };
  const variants = {
    primary: {
      background: disabled ? "var(--color-border)" : hover ? "var(--action-primary-hover)" : "var(--action-primary)",
      color: disabled ? "var(--color-text-muted)" : "#FFFFFF"
    },
    secondary: {
      background: "#FFFFFF",
      border: "1px solid var(--color-border)",
      color: "var(--color-text-3)"
    },
    dark: {
      background: "var(--color-navy)",
      color: "#FFFFFF"
    },
    success: {
      background: "var(--color-success)",
      color: "#FFFFFF"
    },
    ghost: {
      background: hover ? "#EDF3FD" : "transparent",
      color: "var(--color-royal)"
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...sizes[size],
      ...variants[variant],
      ...style
    }
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/Toggle.jsx
try { (() => {
/** Pill toggle switch, 40×22, royal when on (color prop overrides). */
function Toggle({
  checked,
  onChange,
  color = "var(--color-royal)"
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 40,
      height: 22,
      borderRadius: 999,
      border: "none",
      cursor: "pointer",
      padding: 0,
      background: checked ? color : "#CBD5E1",
      transition: "background 0.2s",
      position: "relative",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 3,
      left: checked ? 21 : 3,
      width: 16,
      height: 16,
      borderRadius: 999,
      background: "#FFFFFF",
      transition: "left 0.2s",
      boxShadow: "var(--shadow-toggle-knob)"
    }
  }));
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Toggle.jsx", error: String((e && e.message) || e) }); }

// components/chrome/Sidebar.jsx
try { (() => {
const {
  useState
} = React;
const icons = {
  dashboard: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "14",
    width: "7",
    height: "7",
    rx: "1"
  })),
  processes: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "13",
    x2: "8",
    y2: "13"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "17",
    x2: "8",
    y2: "17"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "10 9 9 9 8 9"
  })),
  approvals: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M22 11.08V12a10 10 0 1 1-5.93-9.14"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22 4 12 14.01 9 11.01"
  })),
  documents: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "7 10 12 15 17 10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "15",
    x2: "12",
    y2: "3"
  })),
  settings: /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"
  }))
};
function NavButton({
  item,
  isActive,
  onClick,
  dim
}) {
  const [hover, setHover] = useState(false);
  const inactive = dim ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.55)";
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      padding: "9px 10px",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      background: isActive ? "rgba(31,95,214,0.18)" : hover ? "rgba(255,255,255,0.06)" : "transparent",
      color: isActive || hover ? "#FFFFFF" : inactive,
      fontSize: 13,
      fontWeight: isActive ? 600 : 500,
      textAlign: "left",
      transition: "all 0.15s",
      position: "relative",
      marginBottom: 2,
      fontFamily: "var(--font-body)"
    }
  }, isActive && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: "50%",
      transform: "translateY(-50%)",
      width: 3,
      height: 20,
      background: "#4C93FF",
      borderRadius: "0 3px 3px 0"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "inherit",
      display: "flex"
    }
  }, icons[item.view] || item.icon), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.badge && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#EF4444",
      color: "#fff",
      fontSize: 10,
      fontWeight: 700,
      borderRadius: 999,
      padding: "1px 6px",
      minWidth: 18,
      textAlign: "center"
    }
  }, item.badge));
}

/**
 * GeraDocs navy app sidebar: brand chip, órgão switcher, nav sections, user row.
 * Faithful port of src/components/Sidebar.tsx (wordmark updated to GeraDocs).
 */
const GERADOCS_LOGO_ESCURO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NzMuMTQgMTAwIiB3aWR0aD0iNDczLjE0IiBoZWlnaHQ9IjEwMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSJHZXJhRG9jcyI+Cjx0aXRsZT5HZXJhRG9jczwvdGl0bGU+CjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xMi43OSAtOS4zKSBzY2FsZSgxLjE2MjgpIj48cGF0aCBmaWxsPSIjNEM5M0ZGIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zNCA4SDU4TDg4IDM4Vjk0SDM0QTIwIDIwIDAgMCAxIDE0IDc0VjI4QTIwIDIwIDAgMCAxIDM0IDhaTTMyIDI0QTIgMiAwIDAgMCAzMCAyNlY3NkEyIDIgMCAwIDAgMzIgNzhINzJWNDQuNkw1MS40IDI0WiIvPgogICAgPGNsaXBQYXRoIGlkPSJkYTQ0MiI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzQgOEg1OEw4OCAzOFY5NEgzNEEyMCAyMCAwIDAgMSAxNCA3NFYyOEEyMCAyMCAwIDAgMSAzNCA4Wk0zMiAyNEEyIDIgMCAwIDAgMzAgMjZWNzZBMiAyIDAgMCAwIDMyIDc4SDcyVjQ0LjZMNTEuNCAyNFoiLz48L2NsaXBQYXRoPgogICAgPGcgY2xpcC1wYXRoPSJ1cmwoI2RhNDQyKSI+PHBhdGggZmlsbD0iIzFGNUZENiIgZD0iTTE0IDcwUTE2IDI4IDU2IDI0TDMwIDI0TDMwIDc4WiIvPjxwYXRoIGZpbGw9IiMyRTZGRTYiIGQ9Ik04OCA2Mkw4OCAxMDBMMCAxMDBMMCA5NFoiLz48L2c+CiAgICA8cGF0aCBmaWxsPSIjRkZEMjREIiBkPSJNNjUgOEg5NEw3OS41IDIyLjVaIi8+PHBhdGggZmlsbD0iIzJCQzA2MiIgZD0iTTk0IDhWMzdMNzkuNSAyMi41WiIvPgogICAgPHJlY3QgeD0iMzgiIHk9IjQ0IiB3aWR0aD0iMjUiIGhlaWdodD0iOCIgcng9IjQiIGZpbGw9IiM0QzkzRkYiLz4KICAgIDxyZWN0IHg9IjM4IiB5PSI1OCIgd2lkdGg9IjE1IiBoZWlnaHQ9IjgiIHJ4PSI0IiBmaWxsPSIjNEM5M0ZGIi8+PC9nPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEyNC4wNiA3MCkiPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0yNC4wMCAwLjgwTDI0LjAwIDAuODBRMTkuMjYgMC44MCAxNS4yMC0wLjcxUTExLjE0LTIuMjMgOC4yMC01LjAzUTUuMjYtNy44MyAzLjYwLTExLjYzUTEuOTQtMTUuNDMgMS45NC0yMC4wMFExLjk0LTI0LjU3IDMuNjAtMjguMzdRNS4yNi0zMi4xNyA4LjIzLTM0Ljk3UTExLjIwLTM3Ljc3IDE1LjI5LTM5LjI5UTE5LjM3LTQwLjgwIDI0LjIzLTQwLjgwTDI0LjIzLTQwLjgwUTI5Ljg5LTQwLjgwIDM0LjM0LTM4LjkxUTM4LjgwLTM3LjAzIDQxLjcxLTMzLjQ5TDQxLjcxLTMzLjQ5TDM0LjUxLTI2Ljk3UTMyLjQ2LTI5LjIwIDMwLjA5LTMwLjMxUTI3LjcxLTMxLjQzIDI0LjgwLTMxLjQzTDI0LjgwLTMxLjQzUTIyLjIzLTMxLjQzIDIwLjExLTMwLjYzUTE4LTI5LjgzIDE2LjUxLTI4LjMxUTE1LjAzLTI2LjgwIDE0LjIwLTI0LjcxUTEzLjM3LTIyLjYzIDEzLjM3LTIwLjAwTDEzLjM3LTIwLjAwUTEzLjM3LTE3LjQ5IDE0LjIwLTE1LjM3UTE1LjAzLTEzLjI2IDE2LjUxLTExLjc0UTE4LTEwLjIzIDIwLjA5LTkuNDBRMjIuMTctOC41NyAyNC42OS04LjU3UTI3LjIwLTguNTcgMjkuNjAtOS40M0wyOS42MC05LjQzUTMwLjE3LTkuNjAgMzAuODAtOS44OUwzMC44MC05Ljg5TDMwLjgwLTIwLjg2TDQwLjgwLTIwLjg2TDQwLjgwLTQuMjlRMzcuMzctMS44MyAzMi44Ni0wLjUxUTI4LjM0IDAuODAgMjQuMDAgMC44MFpNNTkuNzctMTYuMDZMNTkuNzctOC43NEw4MC42OS04Ljc0TDgwLjY5IDBMNDguNTcgMEw0OC41Ny00MC4wMEw3OS45NC00MC4wMEw3OS45NC0zMS4yNkw1OS43Ny0zMS4yNkw1OS43Ny0yNC41MUw3Ny41NC0yNC41MUw3Ny41NC0xNi4wNkw1OS43Ny0xNi4wNlpNOTguODYgMEw4Ny41NCAwTDg3LjU0LTQwLjAwTDEwNS44My00MC4wMFExMTEuMzEtNDAuMDAgMTE1LjI5LTM4LjIzUTExOS4yNi0zNi40NiAxMjEuNDMtMzMuMTFRMTIzLjYwLTI5Ljc3IDEyMy42MC0yNS4yMEwxMjMuNjAtMjUuMjBRMTIzLjYwLTIwLjY5IDEyMS40My0xNy40M0wxMjEuNDMtMTcuNDNRMTE5LjM3LTE0LjI5IDExNS43Ny0xMi41N0wxMTUuNzctMTIuNTdMMTI0LjQwIDBMMTEyLjI5IDBMMTA1LjAzLTEwLjYzTDk4Ljg2LTEwLjYzTDk4Ljg2IDBaTTk4Ljg2LTMxLjA5TDk4Ljg2LTE5LjM3TDEwNS4xNC0xOS4zN1ExMDguNjktMTkuMzcgMTEwLjQzLTIwLjkxUTExMi4xNy0yMi40NiAxMTIuMTctMjUuMjBMMTEyLjE3LTI1LjIwUTExMi4xNy0yOC4wMCAxMTAuNDMtMjkuNTRRMTA4LjY5LTMxLjA5IDEwNS4xNC0zMS4wOUwxMDUuMTQtMzEuMDlMOTguODYtMzEuMDlaTTEzNy4xNCAwTDEyNS42MCAwTDE0My4yNi00MC4wMEwxNTQuNDAtNDAuMDBMMTcyLjExIDBMMTYwLjM0IDBMMTU3LjIwLTcuNzdMMTQwLjI5LTcuNzdMMTM3LjE0IDBaTTE0My42MC0xNi4xMUwxNTMuODktMTYuMTFMMTQ4Ljc0LTI4LjkxTDE0My42MC0xNi4xMVoiLz48cGF0aCBmaWxsPSIjNEM5M0ZGIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNzEuODkgMCkiIGQ9Ik0yMi45MSAwTDQgMEw0LTQwLjAwTDIyLjkxLTQwLjAwUTI5LjU0LTQwLjAwIDM0LjU3LTM3LjU0UTM5LjYwLTM1LjA5IDQyLjQzLTMwLjYzUTQ1LjI2LTI2LjE3IDQ1LjI2LTIwLjAwTDQ1LjI2LTIwLjAwUTQ1LjI2LTEzLjg5IDQyLjQzLTkuNDBRMzkuNjAtNC45MSAzNC41Ny0yLjQ2UTI5LjU0IDAgMjIuOTEgMEwyMi45MSAwWk0xNS4zMS0zMC45N0wxNS4zMS05LjAzTDIyLjQ2LTkuMDNRMjUuODktOS4wMyAyOC40My0xMC4zMVEzMC45Ny0xMS42MCAzMi40MC0xNC4wOVEzMy44My0xNi41NyAzMy44My0yMC4wMEwzMy44My0yMC4wMFEzMy44My0yMy40OSAzMi40MC0yNS45NFEzMC45Ny0yOC40MCAyOC40My0yOS42OVEyNS44OS0zMC45NyAyMi40Ni0zMC45N0wyMi40Ni0zMC45N0wxNS4zMS0zMC45N1pNNzEuOTQgMC44MEw3MS45NCAwLjgwUTY3LjE0IDAuODAgNjMuMDktMC43NFE1OS4wMy0yLjI5IDU2LjAzLTUuMTFRNTMuMDMtNy45NCA1MS4zNy0xMS43MVE0OS43MS0xNS40OSA0OS43MS0yMC4wMEw0OS43MS0yMC4wMFE0OS43MS0yNC41MSA1MS4zNy0yOC4yOVE1My4wMy0zMi4wNiA1Ni4wMy0zNC44OVE1OS4wMy0zNy43MSA2My4wOS0zOS4yNlE2Ny4xNC00MC44MCA3MS45NC00MC44MEw3MS45NC00MC44MFE3Ni44MC00MC44MCA4MC44My0zOS4yNlE4NC44Ni0zNy43MSA4Ny44My0zNC44OVE5MC44MC0zMi4wNiA5Mi40OS0yOC4yOVE5NC4xNy0yNC41MSA5NC4xNy0yMC4wMEw5NC4xNy0yMC4wMFE5NC4xNy0xNS40OSA5Mi40OS0xMS42OVE5MC44MC03Ljg5IDg3LjgzLTUuMDlRODQuODYtMi4yOSA4MC44My0wLjc0UTc2LjgwIDAuODAgNzEuOTQgMC44MFpNNzEuOTQtOC41N0w3MS45NC04LjU3UTc0LjIzLTguNTcgNzYuMjAtOS4zN1E3OC4xNy0xMC4xNyA3OS42My0xMS42OVE4MS4wOS0xMy4yMCA4MS45MS0xNS4zMVE4Mi43NC0xNy40MyA4Mi43NC0yMC4wMEw4Mi43NC0yMC4wMFE4Mi43NC0yMi42MyA4MS45MS0yNC43MVE4MS4wOS0yNi44MCA3OS42My0yOC4zMVE3OC4xNy0yOS44MyA3Ni4yMC0zMC42M1E3NC4yMy0zMS40MyA3MS45NC0zMS40M0w3MS45NC0zMS40M1E2OS42Ni0zMS40MyA2Ny42OS0zMC42M1E2NS43MS0yOS44MyA2NC4yNi0yOC4zMVE2Mi44MC0yNi44MCA2MS45Ny0yNC43MVE2MS4xNC0yMi42MyA2MS4xNC0yMC4wMEw2MS4xNC0yMC4wMFE2MS4xNC0xNy40MyA2MS45Ny0xNS4zMVE2Mi44MC0xMy4yMCA2NC4yNi0xMS42OVE2NS43MS0xMC4xNyA2Ny42OS05LjM3UTY5LjY2LTguNTcgNzEuOTQtOC41N1pNMTIwLjYzIDAuODBMMTIwLjYzIDAuODBRMTE1Ljg5IDAuODAgMTExLjg2LTAuNzFRMTA3LjgzLTIuMjMgMTA0Ljg5LTUuMDNRMTAxLjk0LTcuODMgMTAwLjI5LTExLjYzUTk4LjYzLTE1LjQzIDk4LjYzLTIwLjAwTDk4LjYzLTIwLjAwUTk4LjYzLTI0LjU3IDEwMC4yOS0yOC4zN1ExMDEuOTQtMzIuMTcgMTA0Ljg5LTM0Ljk3UTEwNy44My0zNy43NyAxMTEuODYtMzkuMjlRMTE1Ljg5LTQwLjgwIDEyMC42My00MC44MEwxMjAuNjMtNDAuODBRMTI2LjE3LTQwLjgwIDEzMC41NC0zOC44NlExMzQuOTEtMzYuOTEgMTM3LjgzLTMzLjI2TDEzNy44My0zMy4yNkwxMzAuNjMtMjYuNzRRMTI4LjY5LTI5LjAzIDEyNi4zNy0zMC4yM1ExMjQuMDYtMzEuNDMgMTIxLjIwLTMxLjQzTDEyMS4yMC0zMS40M1ExMTguNzQtMzEuNDMgMTE2LjY5LTMwLjYzUTExNC42My0yOS44MyAxMTMuMTctMjguMzFRMTExLjcxLTI2LjgwIDExMC44OS0yNC42OVExMTAuMDYtMjIuNTcgMTEwLjA2LTIwLjAwTDExMC4wNi0yMC4wMFExMTAuMDYtMTcuNDMgMTEwLjg5LTE1LjMxUTExMS43MS0xMy4yMCAxMTMuMTctMTEuNjlRMTE0LjYzLTEwLjE3IDExNi42OS05LjM3UTExOC43NC04LjU3IDEyMS4yMC04LjU3TDEyMS4yMC04LjU3UTEyNC4wNi04LjU3IDEyNi4zNy05Ljc3UTEyOC42OS0xMC45NyAxMzAuNjMtMTMuMjZMMTMwLjYzLTEzLjI2TDEzNy44My02Ljc0UTEzNC45MS0zLjE0IDEzMC41NC0xLjE3UTEyNi4xNyAwLjgwIDEyMC42MyAwLjgwWk0xNTcuNDkgMC44MEwxNTcuNDkgMC44MFExNTIuNTcgMC44MCAxNDguMDMtMC40M1ExNDMuNDktMS42NiAxNDAuNjMtMy42MEwxNDAuNjMtMy42MEwxNDQuMzQtMTEuOTRRMTQ3LjAzLTEwLjIzIDE1MC41NC05LjExUTE1NC4wNi04IDE1Ny41NC04TDE1Ny41NC04UTE1OS44OS04IDE2MS4zMS04LjQzUTE2Mi43NC04Ljg2IDE2My40MC05LjU3UTE2NC4wNi0xMC4yOSAxNjQuMDYtMTEuMjZMMTY0LjA2LTExLjI2UTE2NC4wNi0xMi42MyAxNjIuODAtMTMuNDNRMTYxLjU0LTE0LjIzIDE1OS41NC0xNC43NFExNTcuNTQtMTUuMjYgMTU1LjExLTE1Ljc3UTE1Mi42OS0xNi4yOSAxNTAuMjYtMTcuMDlRMTQ3LjgzLTE3Ljg5IDE0NS44My0xOS4xN1ExNDMuODMtMjAuNDYgMTQyLjU3LTIyLjU0UTE0MS4zMS0yNC42MyAxNDEuMzEtMjcuODNMMTQxLjMxLTI3LjgzUTE0MS4zMS0zMS40MyAxNDMuMjktMzQuMzRRMTQ1LjI2LTM3LjI2IDE0OS4yMC0zOS4wM1ExNTMuMTQtNDAuODAgMTU5LjAzLTQwLjgwTDE1OS4wMy00MC44MFExNjIuOTctNDAuODAgMTY2Ljc3LTM5LjkxUTE3MC41Ny0zOS4wMyAxNzMuNTQtMzcuMzFMMTczLjU0LTM3LjMxTDE3MC4wNi0yOC45MVExNjcuMjAtMzAuNDYgMTY0LjQwLTMxLjIzUTE2MS42MC0zMiAxNTguOTctMzJMMTU4Ljk3LTMyUTE1Ni42My0zMiAxNTUuMjAtMzEuNTFRMTUzLjc3LTMxLjAzIDE1My4xNC0zMC4yM1ExNTIuNTEtMjkuNDMgMTUyLjUxLTI4LjQwTDE1Mi41MS0yOC40MFExNTIuNTEtMjcuMDkgMTUzLjc0LTI2LjMxUTE1NC45Ny0yNS41NCAxNTctMjUuMDZRMTU5LjAzLTI0LjU3IDE2MS40Ni0yNC4wNlExNjMuODktMjMuNTQgMTY2LjMxLTIyLjc3UTE2OC43NC0yMi4wMCAxNzAuNzQtMjAuNzFRMTcyLjc0LTE5LjQzIDE3My45Ny0xNy4zNFExNzUuMjAtMTUuMjYgMTc1LjIwLTEyLjExTDE3NS4yMC0xMi4xMVExNzUuMjAtOC42MyAxNzMuMjMtNS42OVExNzEuMjYtMi43NCAxNjcuMzQtMC45N1ExNjMuNDMgMC44MCAxNTcuNDkgMC44MFoiLz48L2c+Cjwvc3ZnPgo=";
function Sidebar({
  currentView = "dashboard",
  navigate,
  items = [{
    view: "dashboard",
    label: "Dashboard"
  }, {
    view: "processes",
    label: "Processos"
  }, {
    view: "approvals",
    label: "Aprovações",
    badge: 3
  }, {
    view: "documents",
    label: "Documentos"
  }],
  bottomItems = [{
    view: "settings",
    label: "Configurações"
  }],
  orgName = "Prefeitura de São Paulo",
  orgUnit = "Secretaria de Compras",
  userName = "Maria Costa",
  userRole = "Servidor · Compras",
  userInitials = "MC"
}) {
  const go = v => navigate && navigate(v);
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 240,
      minWidth: 240,
      background: "#071A3D",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 20px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.06)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: GERADOCS_LOGO_ESCURO,
    alt: "GeraDocs",
    style: {
      height: 32,
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.4)",
      fontWeight: 500,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      marginTop: 6
    }
  }, "Uma solu\xE7\xE3o GovPro")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.06)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.35)",
      fontWeight: 600,
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      marginBottom: 6
    }
  }, "\xD3rg\xE3o Atual"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,0.06)",
      borderRadius: 8,
      padding: "8px 10px",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      background: "rgba(31,95,214,0.4)",
      borderRadius: 5,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#4C93FF",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#FFFFFF",
      fontWeight: 600,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, orgName), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.4)"
    }
  }, orgUnit)), /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "rgba(255,255,255,0.3)",
    strokeWidth: "2.5"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  })))), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      padding: "12px 12px",
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.3)",
      fontWeight: 600,
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      padding: "4px 8px",
      marginBottom: 4
    }
  }, "Principal"), items.map(item => /*#__PURE__*/React.createElement(NavButton, {
    key: item.view,
    item: item,
    onClick: () => go(item.view),
    isActive: currentView === item.view || item.view === "processes" && currentView === "etp-form"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.3)",
      fontWeight: 600,
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      padding: "4px 8px",
      marginBottom: 4,
      marginTop: 16
    }
  }, "Sistema"), bottomItems.map(item => /*#__PURE__*/React.createElement(NavButton, {
    key: item.view,
    item: item,
    dim: true,
    onClick: () => go(item.view),
    isActive: currentView === item.view
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderTop: "1px solid rgba(255,255,255,0.06)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 999,
      background: "linear-gradient(135deg, #0E3A94, #1F5FD6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      fontWeight: 700,
      color: "#fff",
      flexShrink: 0
    }
  }, userInitials), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#FFFFFF",
      fontWeight: 600,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, userName), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.4)"
    }
  }, userRole)), /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "rgba(255,255,255,0.3)",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "5",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "19",
    r: "1"
  })))));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/feedback/DocPill.jsx
try { (() => {
const map = {
  "Completo": {
    bg: "#EAF7EF",
    color: "#0B6B33"
  },
  "Em andamento": {
    bg: "#EDF3FD",
    color: "#1650C4"
  },
  "Em revisão": {
    bg: "#E2E8F0",
    color: "#0D3B66"
  },
  "Rejeitado": {
    bg: "#FEF2F2",
    color: "#991B1B"
  },
  "Não iniciado": {
    bg: "#F1F5F9",
    color: "#475569"
  }
};

/** Small square-ish pill for per-document states (ETP/TR columns) and generic tags. */
function DocPill({
  status,
  bg,
  color
}) {
  const c = map[status] || (bg ? {
    bg,
    color
  } : map["Não iniciado"]);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      background: c.bg,
      color: c.color,
      borderRadius: 6,
      padding: "2px 8px",
      fontWeight: 600,
      whiteSpace: "nowrap",
      display: "inline-block"
    }
  }, status);
}

/** Micro tag: Obrigatório / Opcional / Recomendado / Urgente etc. */
function Tag({
  children,
  tone = "info"
}) {
  const tones = {
    info: {
      bg: "#EDF3FD",
      color: "#1650C4"
    },
    success: {
      bg: "#EAF7EF",
      color: "#0B6B33"
    },
    warning: {
      bg: "#E2E8F0",
      color: "#0D3B66"
    },
    danger: {
      bg: "#FEF2F2",
      color: "#991B1B"
    },
    violet: {
      bg: "#F5F3FF",
      color: "#6D28D9"
    },
    neutral: {
      bg: "#F1F5F9",
      color: "#475569"
    }
  };
  const c = tones[tone] || tones.info;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      background: c.bg,
      color: c.color,
      borderRadius: 6,
      padding: "2px 7px",
      fontWeight: 700,
      whiteSpace: "nowrap",
      display: "inline-block"
    }
  }, children);
}
Object.assign(__ds_scope, { DocPill, Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/DocPill.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StatCard.jsx
try { (() => {
/** Dashboard KPI card: icon chip, trend chip, 30px number. */
function StatCard({
  label,
  value,
  sub,
  trend = "up",
  icon,
  color = "#1F5FD6",
  bg = "#EDF3FD"
}) {
  const warn = trend === "warn";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "var(--border-default)",
      borderRadius: "var(--radius-card)",
      padding: "20px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      background: bg,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: color
    }
  }, icon), sub && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: warn ? "#0D3B66" : "#16A34A",
      background: warn ? "#E2E8F0" : "#EAF7EF",
      borderRadius: 6,
      padding: "2px 7px",
      fontWeight: 600
    }
  }, warn ? "!" : "↑", " ", sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 30,
      fontWeight: 800,
      color: "var(--text-body)",
      fontFamily: "var(--font-display)",
      letterSpacing: "-1px",
      lineHeight: 1
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-secondary)",
      marginTop: 4,
      fontWeight: 500
    }
  }, label));
}

/** ETP completion progress bar with gradient fill. */
function ProgressBar({
  percent,
  label,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", null, (label || percent != null) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-label)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--color-royal)"
    }
  }, percent, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: "#F1F5F9",
      borderRadius: 999,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${percent}%`,
      height: "100%",
      background: "var(--gradient-progress)",
      borderRadius: 999,
      transition: "width 0.5s"
    }
  })), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--color-text-muted)",
      marginTop: 5
    }
  }, sub));
}
Object.assign(__ds_scope, { StatCard, ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StatusBadge.jsx
try { (() => {
const config = {
  rascunho: {
    label: "Rascunho",
    bg: "#F1F5F9",
    color: "#475569",
    dot: "#94A3B8"
  },
  em_revisao: {
    label: "Em Revisão",
    bg: "#EAF2FF",
    color: "#0E3A94",
    dot: "#4C93FF"
  },
  aguardando: {
    label: "Aguardando",
    bg: "#FFF8E1",
    color: "#5C4300",
    dot: "#F0A500"
  },
  aprovado: {
    label: "Aprovado",
    bg: "#EAF7EF",
    color: "#0B6B33",
    dot: "#0B7A38"
  },
  rejeitado: {
    label: "Rejeitado",
    bg: "#FEF2F2",
    color: "#991B1B",
    dot: "#EF4444"
  },
  concluido: {
    label: "Concluído",
    bg: "#EAF7EF",
    color: "#0B6B33",
    dot: "#14A04B"
  }
};

/** Process status pill with colored dot. Verbatim recreation of src/components/StatusBadge.tsx. */
function StatusBadge({
  status,
  size = "md"
}) {
  const c = config[status] || config.rascunho;
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  const fs = size === "sm" ? 11 : 12;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      background: c.bg,
      color: c.color,
      borderRadius: 999,
      padding: pad,
      fontSize: fs,
      fontWeight: 600,
      letterSpacing: "0.1px",
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: 999,
      background: c.dot,
      flexShrink: 0
    }
  }), c.label);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ValidationMsg.jsx
try { (() => {
const cfg = {
  ok: {
    bg: "#EAF7EF",
    color: "#0B6B33",
    icon: "✓"
  },
  warn: {
    bg: "#F1F5F9",
    color: "#0D3B66",
    icon: "!"
  },
  error: {
    bg: "#FEF2F2",
    color: "#991B1B",
    icon: "✕"
  }
};

/** Inline validation message under form fields. */
function ValidationMsg({
  type = "ok",
  msg
}) {
  const c = cfg[type];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: c.bg,
      borderRadius: 7,
      padding: "8px 12px",
      marginTop: 10,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: c.color,
      fontWeight: 700,
      fontSize: 13
    }
  }, c.icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: c.color,
      fontWeight: 500
    }
  }, msg));
}

/** Bordered info banner (blue/amber/red/green) with icon slot. */
function InfoBanner({
  tone = "info",
  children
}) {
  const tones = {
    info: {
      bg: "#EDF3FD",
      border: "#C3D5F6",
      color: "#1650C4"
    },
    warning: {
      bg: "#F1F5F9",
      border: "#CBD5E1",
      color: "#0D3B66"
    },
    danger: {
      bg: "#FEF2F2",
      border: "#FECACA",
      color: "#991B1B"
    },
    success: {
      bg: "#EAF7EF",
      border: "#A7F3D0",
      color: "#0B6B33"
    }
  };
  const c = tones[tone] || tones.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: c.color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12.01",
    y2: "16"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: 0,
      fontSize: 13,
      color: c.color
    }
  }, children));
}
Object.assign(__ds_scope, { ValidationMsg, InfoBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ValidationMsg.jsx", error: String((e && e.message) || e) }); }

// components/forms/ChoiceCard.jsx
try { (() => {
/** Selectable card row (modalidade / ATA mode pickers): royal 2px border + tint when selected. */
function ChoiceCard({
  selected,
  onClick,
  icon,
  title,
  desc,
  size = "normal"
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: size === "small" ? "12px 16px" : "16px 20px",
      borderRadius: 12,
      border: selected ? "2px solid var(--color-royal)" : "1px solid var(--color-border)",
      background: selected ? "#EDF3FD" : "#FFFFFF",
      cursor: "pointer",
      textAlign: "left",
      transition: "var(--transition-fast)",
      width: "100%"
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
      color: "var(--color-royal)"
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: size === "small" ? 13 : 14,
      fontWeight: 700,
      color: "var(--text-body)",
      fontFamily: "var(--font-display)"
    }
  }, title), desc && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: size === "small" ? 12 : 13,
      color: "var(--text-secondary)",
      marginTop: 2
    }
  }, desc)), selected && /*#__PURE__*/React.createElement(CheckMark, {
    small: size === "small"
  }));
}

/** Filled royal circle with white check. */
function CheckMark({
  small
}) {
  const s = small ? 16 : 20;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: s,
      height: s,
      borderRadius: 999,
      background: "var(--color-royal)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: small ? 9 : 11,
    height: small ? 9 : 11,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "white",
    strokeWidth: "3.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  })));
}
Object.assign(__ds_scope, { ChoiceCard, CheckMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/ChoiceCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/FileUpload.jsx
try { (() => {
/** Dashed drop-zone that swaps to a file chip once a file is chosen. */
function FileUpload({
  file,
  onChange,
  placeholder = "Clique para selecionar ou arraste o arquivo",
  accept = ".pdf,.docx"
}) {
  if (file) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#F8FAFC",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "10px 14px"
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "var(--color-royal)",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "14 2 14 8 20 8"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 13,
        color: "var(--text-label)",
        fontWeight: 500
      }
    }, file), /*#__PURE__*/React.createElement("button", {
      onClick: () => onChange && onChange(null),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--color-text-muted)",
        padding: 2,
        display: "flex"
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("line", {
      x1: "18",
      y1: "6",
      x2: "6",
      y2: "18"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "6",
      y1: "6",
      x2: "18",
      y2: "18"
    }))));
  }
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: accept,
    style: {
      display: "none"
    },
    onChange: e => {
      const f = e.target.files && e.target.files[0];
      if (f && onChange) onChange(f.name);
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "2px dashed #CBD5E1",
      borderRadius: 8,
      padding: "18px 20px",
      textAlign: "center",
      background: "#FAFAFA"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#94A3B8",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      margin: "0 auto 8px",
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "17 8 12 3 7 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "15"
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: "var(--text-secondary)"
    }
  }, placeholder), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 11,
      color: "var(--color-text-muted)"
    }
  }, accept.replace(/\./g, "").toUpperCase().replace(/,/g, ", "))));
}
Object.assign(__ds_scope, { FileUpload });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FileUpload.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormField.jsx
try { (() => {
/** Label + optional hint + required asterisk wrapper for any field. */
function FormField({
  label,
  required,
  hint,
  children
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-label)",
      marginBottom: hint ? 2 : 6
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--color-danger)",
      marginLeft: 4
    }
  }, "*")), hint && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 8px",
      fontSize: 12,
      color: "var(--color-text-muted)"
    }
  }, hint), children);
}
Object.assign(__ds_scope, { FormField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  width: "100%",
  padding: "10px 13px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: 14,
  color: "var(--text-body)",
  background: "#FFFFFF",
  outline: "none",
  fontFamily: "var(--font-body)",
  boxSizing: "border-box"
};

/** Text input. `prefix` renders a bold slate prefix (e.g. "R$"). */
function Input({
  prefix,
  style,
  ...rest
}) {
  if (prefix) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        fontSize: 13,
        color: "var(--color-slate)",
        fontWeight: 600
      }
    }, prefix), /*#__PURE__*/React.createElement("input", _extends({
      style: {
        ...base,
        paddingLeft: 32,
        ...style
      }
    }, rest)));
  }
  return /*#__PURE__*/React.createElement("input", _extends({
    style: {
      ...base,
      ...style
    }
  }, rest));
}

/** Multiline textarea, 1.6 line-height. */
function Textarea({
  rows = 4,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    style: {
      ...base,
      padding: "12px 14px",
      resize: "vertical",
      lineHeight: 1.6,
      ...style
    }
  }, rest));
}

/** Native select styled to match inputs. */
function Select({
  options = [],
  placeholder,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("select", _extends({
    style: {
      ...base,
      ...style
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o)));
}
Object.assign(__ds_scope, { Input, Textarea, Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchInput.jsx
try { (() => {
/** Bordered search field with magnifier; optional ⌘K kbd chip. */
function SearchInput({
  placeholder = "Buscar...",
  value,
  onChange,
  kbd,
  width = 240,
  background = "#F8FAFC"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background,
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      padding: "0 12px",
      height: 36,
      width
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#94A3B8",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "21",
    x2: "16.65",
    y2: "16.65"
  })), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    style: {
      border: "none",
      background: "transparent",
      fontSize: 13,
      color: "var(--text-body)",
      outline: "none",
      width: "100%",
      fontFamily: "var(--font-body)"
    }
  }), kbd && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#CBD5E1",
      fontFamily: "var(--font-mono)",
      background: "#F1F5F9",
      padding: "2px 5px",
      borderRadius: 4
    }
  }, kbd));
}

/** Segmented status filter: dark navy active pill inside bordered white group. */
function FilterTabs({
  options,
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      background: "#FFFFFF",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      padding: 4,
      flexWrap: "wrap"
    }
  }, options.map(f => /*#__PURE__*/React.createElement("button", {
    key: f.key,
    onClick: () => onChange && onChange(f.key),
    style: {
      padding: "5px 12px",
      borderRadius: 6,
      border: "none",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      background: active === f.key ? "var(--color-navy)" : "transparent",
      color: active === f.key ? "#FFFFFF" : "var(--text-secondary)",
      transition: "var(--transition-fast)",
      fontFamily: "var(--font-body)"
    }
  }, f.label)));
}
Object.assign(__ds_scope, { SearchInput, FilterTabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/chrome/Header.jsx
try { (() => {
/** 60px white top bar: page title, ⌘K search, bell, optional primary CTA. */
function Header({
  title,
  cta,
  onCta,
  children
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 60,
      background: "#FFFFFF",
      borderBottom: "1px solid var(--color-border)",
      display: "flex",
      alignItems: "center",
      padding: "0 28px",
      gap: 16,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 17,
      fontWeight: 700,
      color: "var(--text-body)",
      margin: 0,
      letterSpacing: "-0.3px"
    }
  }, title)), /*#__PURE__*/React.createElement(__ds_scope.SearchInput, {
    placeholder: "Buscar processo, documento...",
    kbd: "\u2318K"
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: "1px solid var(--color-border)",
      background: "#F8FAFC",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#64748B",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13.73 21a2 2 0 0 1-3.46 0"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 7,
      right: 7,
      width: 7,
      height: 7,
      background: "#EF4444",
      borderRadius: 999,
      border: "2px solid #F8FAFC"
    }
  })), cta && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "md",
    onClick: onCta,
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round"
    }, /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "5",
      x2: "12",
      y2: "19"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "5",
      y1: "12",
      x2: "19",
      y2: "12"
    }))
  }, cta), children);
}
Object.assign(__ds_scope, { Header });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/Header.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SectionBlock.jsx
try { (() => {
/** White card wrapping a form section: display-font title, hint, soft divider. */
function SectionBlock({
  title,
  hint,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "var(--border-default)",
      borderRadius: "var(--radius-card)",
      padding: "20px 22px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 15,
      fontWeight: 700,
      color: "var(--text-body)",
      margin: "0 0 6px"
    }
  }, title), hint && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 16px",
      fontSize: 13,
      color: "var(--text-secondary)",
      lineHeight: 1.5
    }
  }, hint), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--color-border-soft)",
      paddingTop: 16
    }
  }, children));
}

/** White card with header row (title + action slot) — tables/lists container. */
function CardPanel({
  title,
  action,
  children,
  padding = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "var(--border-default)",
      borderRadius: "var(--radius-card)",
      overflow: "hidden"
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 20px",
      borderBottom: "1px solid var(--color-border-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 15,
      fontWeight: 700,
      color: "var(--text-body)"
    }
  }, title), action), /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, children));
}
Object.assign(__ds_scope, { SectionBlock, CardPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SectionBlock.jsx", error: String((e && e.message) || e) }); }

// components/navigation/StepIndicator.jsx
try { (() => {
/** Numbered wizard step indicator with green completed / royal active circles. */
function StepIndicator({
  steps,
  current
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 0
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 999,
      background: current > i + 1 ? "var(--color-success)" : current === i + 1 ? "var(--color-royal)" : "var(--color-border)",
      color: current >= i + 1 ? "#FFFFFF" : "var(--color-text-muted)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      fontWeight: 700,
      flexShrink: 0,
      transition: "var(--transition-slow)"
    }
  }, current > i + 1 ? /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "white",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  })) : i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: current === i + 1 ? 700 : 500,
      color: current === i + 1 ? "var(--text-body)" : "var(--color-text-muted)",
      fontFamily: "var(--font-body)"
    }
  }, s)), i < steps.length - 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 2,
      background: current > i + 1 ? "var(--color-success)" : "var(--color-border)",
      margin: "0 12px",
      transition: "background 0.2s"
    }
  }))));
}
Object.assign(__ds_scope, { StepIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/StepIndicator.jsx", error: String((e && e.message) || e) }); }

// ui_kits/geradocs/DashboardScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// GeraDocs UI kit — Dashboard (recreation of src/views/Dashboard.tsx)
const DS = window.GovProGeraDocsDesignSystem_11bcef;
function GDIcon({
  d,
  poly,
  extra,
  size = 20,
  sw = 2
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: sw,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, d && /*#__PURE__*/React.createElement("path", {
    d: d
  }), poly && poly.map((p, i) => /*#__PURE__*/React.createElement("polyline", {
    key: i,
    points: p
  })), extra);
}
const gdStats = [{
  label: "Processos Ativos",
  value: "24",
  sub: "+3 este mês",
  trend: "up",
  color: "#1F5FD6",
  bg: "#EDF3FD",
  icon: /*#__PURE__*/React.createElement(GDIcon, {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    poly: ["14 2 14 8 20 8"]
  })
}, {
  label: "Aguardando Aprovação",
  value: "7",
  sub: "3 com urgência",
  trend: "warn",
  color: "#0D3B66",
  bg: "#F1F5F9",
  icon: /*#__PURE__*/React.createElement(GDIcon, {
    extra: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "12 6 12 12 16 14"
    }))
  })
}, {
  label: "Documentos Gerados",
  value: "138",
  sub: "12 esta semana",
  trend: "up",
  color: "#0D9488",
  bg: "#F0FDFA",
  icon: /*#__PURE__*/React.createElement(GDIcon, {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
    poly: ["7 10 12 15 17 10"],
    extra: /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "15",
      x2: "12",
      y2: "3"
    })
  })
}, {
  label: "ETPs Concluídos",
  value: "61",
  sub: "Taxa de conclusão: 89%",
  trend: "up",
  color: "#16A34A",
  bg: "#EAF7EF",
  icon: /*#__PURE__*/React.createElement(GDIcon, {
    d: "M22 11.08V12a10 10 0 1 1-5.93-9.14",
    poly: ["22 4 12 14.01 9 11.01"]
  })
}];
const gdRecent = [{
  id: "PROC-2024-089",
  title: "Aquisição de Equipamentos de TI",
  secretaria: "Secretaria de Educação",
  status: "em_revisao",
  valor: "R$ 485.000,00",
  date: "05/07/2024"
}, {
  id: "PROC-2024-088",
  title: "Contratação de Serviços de Limpeza",
  secretaria: "Secretaria de Obras",
  status: "aguardando",
  valor: "R$ 120.000,00",
  date: "04/07/2024"
}, {
  id: "PROC-2024-087",
  title: "Fornecimento de Material de Escritório",
  secretaria: "Administração Central",
  status: "aprovado",
  valor: "R$ 38.500,00",
  date: "03/07/2024"
}, {
  id: "PROC-2024-086",
  title: "Serviços de Manutenção Predial",
  secretaria: "Secretaria de Saúde",
  status: "rascunho",
  valor: "R$ 210.000,00",
  date: "02/07/2024"
}, {
  id: "PROC-2024-085",
  title: "Aquisição de Veículos Oficiais",
  secretaria: "Frota Municipal",
  status: "concluido",
  valor: "R$ 920.000,00",
  date: "01/07/2024"
}];
const gdPending = [{
  id: "PROC-2024-088",
  label: "Contratação de Serviços de Limpeza",
  type: "ETP",
  urgente: true
}, {
  id: "PROC-2024-083",
  label: "Sistema de Gestão de RH",
  type: "TR",
  urgente: true
}, {
  id: "PROC-2024-081",
  label: "Reforma Escola Municipal Centro",
  type: "ETP",
  urgente: false
}];
function GDRow({
  p,
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("tr", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      cursor: "pointer",
      borderBottom: "1px solid #F8FAFC",
      background: h ? "#F8FAFC" : "transparent",
      transition: "background 0.1s"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "13px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#071A3D"
    }
  }, p.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94A3B8",
      fontFamily: "var(--font-mono)",
      marginTop: 2
    }
  }, p.id)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "13px 16px",
      fontSize: 12,
      color: "#64748B"
    }
  }, p.secretaria), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "13px 16px",
      fontSize: 13,
      fontWeight: 600,
      color: "#0E3A94",
      fontFamily: "var(--font-mono)"
    }
  }, p.valor), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "13px 16px"
    }
  }, /*#__PURE__*/React.createElement(DS.StatusBadge, {
    status: p.status,
    size: "sm"
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "13px 16px",
      fontSize: 12,
      color: "#94A3B8"
    }
  }, p.date));
}
function DashboardScreen({
  navigate
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px",
      maxWidth: 1200
    },
    "data-screen-label": "Dashboard"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 28,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: "#64748B",
      marginBottom: 4
    }
  }, "Quinta-feira, 09 de julho de 2026"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 800,
      color: "#071A3D",
      letterSpacing: "-0.5px"
    }
  }, "Bom dia, Maria")), /*#__PURE__*/React.createElement(DS.Button, {
    variant: "primary",
    size: "lg",
    onClick: () => navigate("new-process"),
    icon: /*#__PURE__*/React.createElement("svg", {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round"
    }, /*#__PURE__*/React.createElement("line", {
      x1: "12",
      y1: "5",
      x2: "12",
      y2: "19"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "5",
      y1: "12",
      x2: "19",
      y2: "12"
    }))
  }, "Novo Processo de Contrata\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
      marginBottom: 24
    }
  }, gdStats.map(s => /*#__PURE__*/React.createElement(DS.StatCard, _extends({
    key: s.label
  }, s)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 340px",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(DS.CardPanel, {
    title: "Processos Recentes",
    action: /*#__PURE__*/React.createElement("button", {
      onClick: () => navigate("processes"),
      style: {
        fontSize: 13,
        color: "#1F5FD6",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontWeight: 600
      }
    }, "Ver todos \u2192")
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "#F8FAFC"
    }
  }, ["Processo", "Secretaria", "Valor Est.", "Status", "Data"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "10px 16px",
      textAlign: "left",
      fontSize: 11,
      color: "#94A3B8",
      fontWeight: 600,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      borderBottom: "1px solid #F1F5F9"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, gdRecent.map(p => /*#__PURE__*/React.createElement(GDRow, {
    key: p.id,
    p: p,
    onClick: () => navigate("etp-form", p.id)
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      borderRadius: 12,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 18px",
      borderBottom: "1px solid #F1F5F9",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 15,
      fontWeight: 700,
      color: "#071A3D"
    }
  }, "Pendentes de Aprova\xE7\xE3o"), /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#FEF2F2",
      color: "#EF4444",
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 999,
      padding: "2px 8px"
    }
  }, gdPending.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 0"
    }
  }, gdPending.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    onClick: () => navigate("approvals"),
    style: {
      padding: "12px 18px",
      cursor: "pointer",
      display: "flex",
      alignItems: "flex-start",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      background: "#EDF3FD",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#1F5FD6",
      fontFamily: "var(--font-mono)"
    }
  }, item.type)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#071A3D",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, item.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94A3B8",
      fontFamily: "var(--font-mono)",
      marginTop: 2
    }
  }, item.id)), item.urgente && /*#__PURE__*/React.createElement(DS.Tag, {
    tone: "warning"
  }, "Urgente")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 18px",
      borderTop: "1px solid #F1F5F9"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate("approvals"),
    style: {
      width: "100%",
      padding: "9px",
      background: "#EDF3FD",
      color: "#1F5FD6",
      border: "none",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, "Ver todas as aprova\xE7\xF5es"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#071A3D",
      borderRadius: 12,
      padding: "20px 18px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 14px",
      fontFamily: "var(--font-display)",
      fontSize: 15,
      fontWeight: 700,
      color: "#FFFFFF"
    }
  }, "A\xE7\xF5es R\xE1pidas"), [{
    label: "Novo ETP",
    desc: "Estudo Técnico Preliminar",
    icon: /*#__PURE__*/React.createElement(GDIcon, {
      size: 18,
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
      extra: /*#__PURE__*/React.createElement("rect", {
        x: "8",
        y: "2",
        width: "8",
        height: "4",
        rx: "1"
      })
    })
  }, {
    label: "Novo TR",
    desc: "Termo de Referência",
    icon: /*#__PURE__*/React.createElement(GDIcon, {
      size: 18,
      d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
      poly: ["14 2 14 8 20 8"],
      extra: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
        x1: "16",
        y1: "13",
        x2: "8",
        y2: "13"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "16",
        y1: "17",
        x2: "8",
        y2: "17"
      }))
    })
  }, {
    label: "Consultar PNCP",
    desc: "Portal Nacional de Contratações",
    icon: /*#__PURE__*/React.createElement(GDIcon, {
      size: 18,
      extra: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
        cx: "11",
        cy: "11",
        r: "8"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "21",
        y1: "21",
        x2: "16.65",
        y2: "16.65"
      }))
    })
  }].map(a => /*#__PURE__*/React.createElement("button", {
    key: a.label,
    onClick: () => navigate("new-process"),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      padding: "10px 12px",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 9,
      cursor: "pointer",
      marginBottom: 8,
      textAlign: "left",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#4C93FF",
      display: "flex",
      flexShrink: 0
    }
  }, a.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#FFFFFF"
    }
  }, a.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.4)"
    }
  }, a.desc))))))));
}
Object.assign(window, {
  DashboardScreen,
  GDIcon
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/geradocs/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/geradocs/ETPFormScreen.jsx
try { (() => {
// GeraDocs UI kit — ETP editor (recreation of src/views/ETPForm.tsx, abbreviated)
const DSE = window.GovProGeraDocsDesignSystem_11bcef;
const etpSections = [{
  id: "1",
  title: "Descrição da Necessidade",
  status: "completo",
  required: true
}, {
  id: "2",
  title: "Área Requisitante",
  status: "completo",
  required: true
}, {
  id: "3",
  title: "Descrição dos Requisitos",
  status: "completo",
  required: true
}, {
  id: "4",
  title: "Estimativa das Quantidades",
  status: "em_andamento",
  required: true
}, {
  id: "5",
  title: "Estimativa do Valor",
  status: "em_andamento",
  required: true
}, {
  id: "6",
  title: "Soluções Disponíveis no Mercado",
  status: "pendente",
  required: true
}, {
  id: "7",
  title: "Justificativa para Contratação",
  status: "pendente",
  required: true
}, {
  id: "8",
  title: "Análise da Viabilidade",
  status: "pendente",
  required: true
}, {
  id: "9",
  title: "Declaração de Viabilidade",
  status: "pendente",
  required: true
}, {
  id: "10",
  title: "Responsável Técnico",
  status: "pendente",
  required: true
}, {
  id: "11",
  title: "Sustentabilidade",
  status: "pendente",
  required: false
}, {
  id: "12",
  title: "Posicionamento Conclusivo",
  status: "pendente",
  required: false
}];
const etpStatusMap = {
  completo: {
    dot: "#0B7A38",
    bg: "#EAF7EF",
    color: "#0B6B33"
  },
  em_andamento: {
    dot: "#1F5FD6",
    bg: "#EDF3FD",
    color: "#1650C4"
  },
  pendente: {
    dot: "#94A3B8",
    bg: "#F1F5F9",
    color: "#475569"
  }
};
const etpDone = etpSections.filter(s => s.status === "completo").length;
const etpProgress = Math.round(etpDone / etpSections.length * 100);
function ETPFormScreen({
  navigate
}) {
  const [active, setActive] = React.useState("4");
  const [saved, setSaved] = React.useState(false);
  const [showATA, setShowATA] = React.useState(false);
  const [ataMode, setAtaMode] = React.useState("");
  const [ataFile, setAtaFile] = React.useState(null);
  const [review, setReview] = React.useState(null);
  const sec = etpSections.find(s => s.id === active);
  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  const ataOptions = [{
    key: "attach",
    label: "Anexar ATA para revisão pela IA",
    desc: "Envie a ATA que deseja utilizar. A IA verificará validade, compatibilidade e emitirá parecer."
  }, {
    key: "delegate",
    label: "Delegar ao modelo a busca de ATAs válidas",
    desc: "A IA buscará ATAs compatíveis com o objeto. Você visualizará as origens e selecionará a desejada."
  }, {
    key: "both",
    label: "Anexar ATA e buscar outras opções",
    desc: "A IA revisará sua ATA e também sugerirá alternativas encontradas para comparação."
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100%",
      overflow: "hidden"
    },
    "data-screen-label": "ETP Editor"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 280,
      minWidth: 280,
      background: "#FFFFFF",
      borderRight: "1px solid #E2E8F0",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 18px 14px",
      borderBottom: "1px solid #F1F5F9"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "#94A3B8"
    }
  }, "PROC-2024-089"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#071A3D",
      marginTop: 2,
      lineHeight: 1.3
    }
  }, "Aquisi\xE7\xE3o de Equip. de TI"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#64748B",
      marginTop: 3
    }
  }, "Secretaria de Educa\xE7\xE3o")), /*#__PURE__*/React.createElement(DSE.ProgressBar, {
    percent: etpProgress,
    label: "Progresso do ETP",
    sub: `${etpDone} de ${etpSections.length} seções concluídas`
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "10px 10px"
    }
  }, etpSections.map(s => {
    const sc = etpStatusMap[s.status];
    const isActive = active === s.id;
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      onClick: () => setActive(s.id),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 10px",
        borderRadius: 8,
        border: isActive ? "1px solid #C3D5F6" : "1px solid transparent",
        background: isActive ? "#EDF3FD" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        marginBottom: 2,
        fontFamily: "var(--font-body)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: 6,
        background: sc.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: 10,
        fontWeight: 700,
        color: sc.color,
        fontFamily: "var(--font-mono)"
      }
    }, s.status === "completo" ? /*#__PURE__*/React.createElement("svg", {
      width: "11",
      height: "11",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: sc.dot,
      strokeWidth: "3",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "20 6 9 17 4 12"
    })) : s.id), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? "#1650C4" : "#374151",
        lineHeight: 1.3
      }
    }, s.title, !s.required && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#94A3B8",
        marginLeft: 5
      }
    }, "Opt."))), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 999,
        background: sc.dot,
        flexShrink: 0
      }
    }));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "#F8FAFC"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      borderBottom: "1px solid #E2E8F0",
      padding: "14px 24px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94A3B8",
      marginBottom: 2
    }
  }, "Se\xE7\xE3o ", sec.id, " de ", etpSections.length), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 17,
      fontWeight: 700,
      color: "#071A3D",
      letterSpacing: "-0.3px"
    }
  }, sec.title)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(DSE.Button, {
    variant: "secondary",
    size: "sm"
  }, "Orienta\xE7\xF5es"), /*#__PURE__*/React.createElement(DSE.Button, {
    variant: saved ? "success" : "primary",
    size: "sm",
    onClick: save
  }, saved ? "Salvo!" : "Salvar"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "24px"
    }
  }, active === "4" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(DSE.SectionBlock, {
    title: "Estimativa das Quantidades",
    hint: "Informe as quantidades estimadas com base no hist\xF3rico de consumo, demanda projetada ou levantamentos realizados pela \xE1rea t\xE9cnica."
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(DSE.FormField, {
    label: "Quantidade Estimada",
    required: true
  }, /*#__PURE__*/React.createElement(DSE.Input, {
    defaultValue: "150"
  })), /*#__PURE__*/React.createElement(DSE.FormField, {
    label: "Unidade de Medida",
    required: true
  }, /*#__PURE__*/React.createElement(DSE.Select, {
    options: ["Unidade", "Serviço", "Metro Quadrado", "Licença"]
  })), /*#__PURE__*/React.createElement(DSE.FormField, {
    label: "Per\xEDodo de Vig\xEAncia",
    required: true
  }, /*#__PURE__*/React.createElement(DSE.Select, {
    options: ["12 meses", "24 meses", "36 meses"]
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(DSE.FormField, {
    label: "Mem\xF3ria de C\xE1lculo",
    hint: "Descreva a metodologia utilizada para estimar as quantidades"
  }, /*#__PURE__*/React.createElement(DSE.Textarea, {
    rows: 3,
    placeholder: "Ex: Quantidade estimada com base no levantamento realizado junto \xE0s 30 unidades escolares da rede municipal..."
  })))), /*#__PURE__*/React.createElement(DSE.SectionBlock, {
    title: "Estimativa do Valor",
    hint: "Baseie-se em pesquisas de mercado, contratos anteriores ou painel de pre\xE7os do governo federal."
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(DSE.FormField, {
    label: "Valor Unit\xE1rio Estimado (R$)",
    required: true
  }, /*#__PURE__*/React.createElement(DSE.Input, {
    prefix: "R$",
    defaultValue: "3.233,33"
  })), /*#__PURE__*/React.createElement(DSE.FormField, {
    label: "Valor Total Estimado (R$)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 13px",
      border: "1px solid #E2E8F0",
      borderRadius: 8,
      background: "#F8FAFC",
      color: "#0E3A94",
      fontWeight: 700,
      fontFamily: "var(--font-mono)",
      fontSize: 14
    }
  }, "R$ 485.000,00"))))) : /*#__PURE__*/React.createElement(DSE.SectionBlock, {
    title: sec.title,
    hint: "Preencha as informa\xE7\xF5es desta se\xE7\xE3o conforme as orienta\xE7\xF5es metodol\xF3gicas do ETP."
  }, sec.status === "completo" ? /*#__PURE__*/React.createElement(DSE.ValidationMsg, {
    type: "ok",
    msg: "Esta se\xE7\xE3o foi preenchida e validada. Clique para revisar o conte\xFAdo."
  }) : /*#__PURE__*/React.createElement(DSE.Textarea, {
    rows: 6,
    placeholder: "Preencha o conte\xFAdo desta se\xE7\xE3o..."
  })), active === "6" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(135deg, #1E3A5F 0%, #0E3A94 100%)",
      borderRadius: 12,
      padding: "18px 20px",
      display: "flex",
      alignItems: "flex-start",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      background: "rgba(76,147,255,0.15)",
      borderRadius: 9,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#4C93FF",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#FFFFFF",
      fontFamily: "var(--font-display)",
      marginBottom: 4
    }
  }, "A solu\xE7\xE3o proposta \xE9 Ades\xE3o de ATA?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: "rgba(255,255,255,0.65)"
    }
  }, "Se o ETP concluir que a solu\xE7\xE3o mais vantajosa \xE9 a Ades\xE3o de Ata de Registro de Pre\xE7os, configure a ATA aqui para que o modelo possa validar ou encontrar op\xE7\xF5es adequadas.")), /*#__PURE__*/React.createElement(DSE.Button, {
    variant: "primary",
    size: "sm",
    onClick: () => setShowATA(!showATA)
  }, showATA ? "Fechar" : "Configurar ATA")), showATA && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      borderRadius: 12,
      padding: "20px 22px",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 15,
      fontWeight: 700,
      color: "#071A3D",
      margin: "0 0 4px"
    }
  }, "Gest\xE3o da Ata de Registro de Pre\xE7os"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 16px",
      fontSize: 13,
      color: "#64748B"
    }
  }, "Escolha como deseja proceder com a ATA para este processo."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginBottom: 16
    }
  }, ataOptions.map(opt => /*#__PURE__*/React.createElement(DSE.ChoiceCard, {
    key: opt.key,
    size: "small",
    selected: ataMode === opt.key,
    onClick: () => setAtaMode(opt.key),
    title: opt.label,
    desc: opt.desc
  }))), (ataMode === "attach" || ataMode === "both") && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(DSE.FormField, {
    label: "Anexar ATA",
    required: true
  }, /*#__PURE__*/React.createElement(DSE.FileUpload, {
    file: ataFile,
    onChange: f => {
      setAtaFile(f);
      setReview(null);
    },
    placeholder: "Clique para selecionar a ATA (PDF ou DOCX)"
  })), ataFile && review === null && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(DSE.Button, {
    variant: "primary",
    size: "sm",
    onClick: () => {
      setReview("loading");
      setTimeout(() => setReview("done"), 2200);
    }
  }, "Enviar para revis\xE3o pela IA")), review === "loading" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      background: "#EDF3FD",
      borderRadius: 8,
      padding: "12px 16px",
      fontSize: 13,
      color: "#1650C4"
    }
  }, "Analisando ATA... aguarde."), review === "done" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      background: "#EAF7EF",
      border: "1px solid #A7F3D0",
      borderRadius: 10,
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#0B6B33",
      marginBottom: 6
    }
  }, "Parecer da IA \u2014 ATA V\xE1lida"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: "#047857",
      lineHeight: 1.6
    }
  }, "A ATA analisada est\xE1 vigente, com objeto compat\xEDvel ao ETP e dentro dos limites legais para ades\xE3o (Art. 86 da Lei 14.133/21). Prazo de vig\xEAncia: 30/11/2025. \xD3rg\xE3o gerenciador: Governo do Estado de S\xE3o Paulo. Nenhuma irregularidade identificada."))), ataMode === "delegate" && /*#__PURE__*/React.createElement(DSE.InfoBanner, {
    tone: "info"
  }, "O modelo realizar\xE1 a busca de ATAs compat\xEDveis ap\xF3s a confirma\xE7\xE3o. Os resultados \u2014 com origem, \xF3rg\xE3o gerenciador e validade \u2014 ficar\xE3o dispon\xEDveis neste processo para sua sele\xE7\xE3o."), ataMode !== "" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(DSE.Button, {
    variant: "dark",
    size: "sm"
  }, "Confirmar configura\xE7\xE3o da ATA")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(DSE.Button, {
    variant: "secondary",
    size: "sm",
    disabled: active === "1",
    onClick: () => {
      const i = etpSections.findIndex(s => s.id === active);
      if (i > 0) setActive(etpSections[i - 1].id);
    }
  }, "\u2190 Se\xE7\xE3o Anterior"), active === "12" ? /*#__PURE__*/React.createElement(DSE.Button, {
    variant: "success",
    size: "sm",
    onClick: () => navigate("processes")
  }, "Finalizar e Gerar Documento") : /*#__PURE__*/React.createElement(DSE.Button, {
    variant: "primary",
    size: "sm",
    onClick: () => {
      save();
      const i = etpSections.findIndex(s => s.id === active);
      if (i < etpSections.length - 1) setActive(etpSections[i + 1].id);
    }
  }, "Salvar e Avan\xE7ar \u2192")))));
}
Object.assign(window, {
  ETPFormScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/geradocs/ETPFormScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/geradocs/NewProcessScreen.jsx
try { (() => {
// GeraDocs UI kit — Novo Processo wizard (recreation of src/views/NewProcess.tsx, abbreviated)
const DSN = window.GovProGeraDocsDesignSystem_11bcef;
const npIcon = children => /*#__PURE__*/React.createElement("svg", {
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, children);
const gdModalidades = [{
  key: "pregao",
  label: "Pregão Eletrônico",
  desc: "Para aquisição de bens e serviços comuns",
  icon: npIcon(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "21",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "20",
    cy: "21",
    r: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
  })))
}, {
  key: "concorrencia",
  label: "Concorrência",
  desc: "Para obras, serviços e compras de grande vulto",
  icon: npIcon(/*#__PURE__*/React.createElement("path", {
    d: "M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"
  }))
}, {
  key: "dispensa",
  label: "Dispensa de Licitação",
  desc: "Casos previstos no Art. 75 da Lei 14.133/21",
  icon: npIcon(/*#__PURE__*/React.createElement("polygon", {
    points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2"
  }))
}, {
  key: "inexigibilidade",
  label: "Inexigibilidade",
  desc: "Quando a competição é inviável",
  icon: npIcon(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "11",
    width: "18",
    height: "11",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11V7a5 5 0 0 1 10 0v4"
  })))
}, {
  key: "credenciamento",
  label: "Credenciamento",
  desc: "Para seleção de prestadores de serviços",
  icon: npIcon(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "2",
    width: "8",
    height: "4",
    rx: "1"
  })))
}];
const gdSecretarias = ["Secretaria de Educação", "Secretaria de Saúde", "Secretaria de Obras e Infraestrutura", "Secretaria de Administração", "Secretaria de Finanças", "Frota Municipal", "Administração Central"];
function NewProcessScreen({
  navigate
}) {
  const [step, setStep] = React.useState(1);
  const [modalidade, setModalidade] = React.useState("");
  const [adesao, setAdesao] = React.useState(false);
  const [ataMode, setAtaMode] = React.useState("");
  const [ataMotivo, setAtaMotivo] = React.useState("");
  const [ataFile, setAtaFile] = React.useState(null);
  const [secretaria, setSecretaria] = React.useState("");
  const [objeto, setObjeto] = React.useState("");
  const [dfdFile, setDfdFile] = React.useState(null);
  const [docs, setDocs] = React.useState({
    etp: true,
    tr: true,
    cotacao: false,
    mapa: false
  });
  const [verifDFD, setVerifDFD] = React.useState(false);
  const [retif, setRetif] = React.useState(false);
  const dfdOrObjeto = dfdFile !== null || objeto.trim() !== "";
  const canProceed = step === 1 && modalidade !== "" && (!adesao || ataMode !== "" && ataMotivo.trim() !== "") || step === 2 && secretaria !== "" && dfdOrObjeto || step === 3;
  const ataOptions = [{
    key: "attach",
    label: "Anexar ATA para revisão pela IA",
    desc: "A plataforma analisará a ATA enviada e verificará sua compatibilidade com o objeto."
  }, {
    key: "delegate",
    label: "Delegar ao modelo a busca de ATAs válidas",
    desc: "A IA buscará ATAs compatíveis; você poderá visualizar as origens e selecionar."
  }, {
    key: "both",
    label: "Anexar ATA e também buscar outras opções",
    desc: "A IA revisa sua ATA e ainda sugere alternativas encontradas."
  }];
  const docOptions = [{
    key: "etp",
    title: "Estudo Técnico Preliminar (ETP)",
    desc: "Fundamenta a necessidade e os requisitos técnicos da contratação",
    obrig: true,
    sections: 12,
    color: "#1F5FD6",
    bg: "#EDF3FD"
  }, {
    key: "tr",
    title: "Termo de Referência (TR)",
    desc: "Define as condições para execução do objeto da licitação",
    obrig: true,
    sections: 15,
    color: "#0D9488",
    bg: "#F0FDFA"
  }, {
    key: "cotacao",
    title: "Cotação de Mercado",
    desc: "Pesquisa de preços com fornecedores para embasar a estimativa de valor",
    obrig: false,
    sections: 4,
    color: "#7C3AED",
    bg: "#F5F3FF"
  }, {
    key: "mapa",
    title: "Mapa de Riscos",
    desc: "Avaliação e classificação dos riscos envolvidos na contratação",
    obrig: false,
    sections: 5,
    color: "#B45309",
    bg: "#FFFBEB"
  }];
  const h2 = {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    fontWeight: 800,
    color: "#071A3D",
    margin: "0 0 6px",
    letterSpacing: "-0.5px"
  };
  const sub = {
    margin: "0 0 24px",
    fontSize: 14,
    color: "#64748B"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px",
      maxWidth: 880
    },
    "data-screen-label": "Novo Processo"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 36
    }
  }, /*#__PURE__*/React.createElement(DSN.StepIndicator, {
    steps: ["Modalidade", "Identificação", "Documentos"],
    current: step
  })), step === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Selecione a Modalidade"), /*#__PURE__*/React.createElement("p", {
    style: sub
  }, "Escolha a modalidade de licita\xE7\xE3o de acordo com o objeto e os valores estimados."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginBottom: 24
    }
  }, gdModalidades.map(m => /*#__PURE__*/React.createElement(DSN.ChoiceCard, {
    key: m.key,
    selected: modalidade === m.key,
    onClick: () => setModalidade(m.key),
    icon: m.icon,
    title: m.label,
    desc: m.desc
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      borderRadius: 12,
      padding: "18px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(DSN.Toggle, {
    checked: adesao,
    onChange: setAdesao
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#071A3D",
      fontFamily: "var(--font-display)"
    }
  }, "Este processo ser\xE1 instaurado como Ades\xE3o de Ata de Registro de Pre\xE7os"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 13,
      color: "#64748B"
    }
  }, "Ative caso a solu\xE7\xE3o j\xE1 seja previamente definida como Ades\xE3o de ATA. O modelo ser\xE1 orientado a gerar o ETP com essa conclus\xE3o."))), adesao && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      borderTop: "1px solid #F1F5F9",
      paddingTop: 18,
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(DSN.FormField, {
    label: "Motivo da decis\xE3o pr\xE9via pela Ades\xE3o de ATA",
    required: true,
    hint: "Justifique por que a Ades\xE3o de ATA j\xE1 foi definida antes do ETP"
  }, /*#__PURE__*/React.createElement(DSN.Textarea, {
    rows: 3,
    value: ataMotivo,
    onChange: e => setAtaMotivo(e.target.value),
    placeholder: "Ex: Existe ATA vigente do PNCP com objeto compat\xEDvel e condi\xE7\xF5es vantajosas devidamente comprovadas..."
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#374151"
    }
  }, "Gest\xE3o da ATA"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginTop: 8
    }
  }, ataOptions.map(opt => /*#__PURE__*/React.createElement(DSN.ChoiceCard, {
    key: opt.key,
    size: "small",
    selected: ataMode === opt.key,
    onClick: () => setAtaMode(opt.key),
    title: opt.label,
    desc: opt.desc
  })))), (ataMode === "attach" || ataMode === "both") && /*#__PURE__*/React.createElement(DSN.FormField, {
    label: "Anexar ATA",
    hint: "Formatos aceitos: PDF, DOCX"
  }, /*#__PURE__*/React.createElement(DSN.FileUpload, {
    file: ataFile,
    onChange: setAtaFile,
    placeholder: "Clique para selecionar a ATA ou arraste o arquivo",
    accept: ".pdf,.docx"
  })), ataMode === "delegate" && /*#__PURE__*/React.createElement(DSN.InfoBanner, {
    tone: "info"
  }, "O modelo realizar\xE1 a busca de ATAs ap\xF3s o processo ser criado. Os resultados ficar\xE3o dispon\xEDveis na aba de Processos para sua an\xE1lise e sele\xE7\xE3o.")))), step === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Identifica\xE7\xE3o do Processo"), /*#__PURE__*/React.createElement("p", {
    style: sub
  }, "Informe os dados b\xE1sicos. \xC9 obrigat\xF3rio preencher ao menos o DFD ou o Objeto da Contrata\xE7\xE3o."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(DSN.FormField, {
    label: "Secretaria Requisitante",
    required: true
  }, /*#__PURE__*/React.createElement(DSN.Select, {
    value: secretaria,
    onChange: e => setSecretaria(e.target.value),
    placeholder: "Selecione a secretaria...",
    options: gdSecretarias
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      borderRadius: 12,
      padding: "18px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#374151"
    }
  }, "Documento de Formaliza\xE7\xE3o de Demanda (DFD)", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      background: "#E2E8F0",
      color: "#0D3B66",
      borderRadius: 6,
      padding: "2px 7px",
      fontWeight: 600,
      marginLeft: 8
    }
  }, "Recomendado")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 12,
      color: "#64748B"
    }
  }, "O DFD alimentar\xE1 automaticamente as se\xE7\xF5es do ETP. Caso n\xE3o possua, preencha o campo Objeto abaixo.")), /*#__PURE__*/React.createElement(DSN.FileUpload, {
    file: dfdFile,
    onChange: setDfdFile,
    placeholder: "Clique para selecionar o DFD ou arraste o arquivo aqui",
    accept: ".pdf,.docx,.doc"
  }), dfdFile && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(DSN.ValidationMsg, {
    type: "ok",
    msg: "DFD anexado \u2014 o ETP ser\xE1 gerado com base neste documento."
  }))), /*#__PURE__*/React.createElement(DSN.FormField, {
    label: "Objeto da Contrata\xE7\xE3o",
    required: !dfdFile,
    hint: dfdFile ? "Opcional quando o DFD é inserido — use como complemento ou detalhamento" : "Obrigatório quando o DFD não é inserido"
  }, /*#__PURE__*/React.createElement(DSN.Textarea, {
    rows: 3,
    value: objeto,
    onChange: e => setObjeto(e.target.value),
    placeholder: "Ex: Aquisi\xE7\xE3o de equipamentos de inform\xE1tica para as unidades escolares da rede municipal..."
  })), !dfdOrObjeto && /*#__PURE__*/React.createElement(DSN.InfoBanner, {
    tone: "danger"
  }, "Preencha ao menos o DFD ou o Objeto da Contrata\xE7\xE3o para continuar."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(DSN.FormField, {
    label: "Valor de Refer\xEAncia Estimado"
  }, /*#__PURE__*/React.createElement(DSN.Input, {
    placeholder: "R$ 0,00"
  })), /*#__PURE__*/React.createElement(DSN.FormField, {
    label: "Fundamento Legal"
  }, /*#__PURE__*/React.createElement(DSN.Input, {
    placeholder: "Ex: Art. 75, II, Lei 14.133/21"
  }))))), step === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Configurar Processo"), /*#__PURE__*/React.createElement("p", {
    style: sub
  }, "Selecione os documentos a gerar e configure as fases opcionais do processo."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#374151",
      display: "block",
      marginBottom: 12
    }
  }, "Documentos a Gerar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, docOptions.map(d => {
    const selected = docs[d.key];
    return /*#__PURE__*/React.createElement("button", {
      key: d.key,
      onClick: () => {
        if (!d.obrig) setDocs(p => ({
          ...p,
          [d.key]: !p[d.key]
        }));
      },
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "16px 18px",
        borderRadius: 12,
        border: selected ? `2px solid ${d.color}` : "1px solid #E2E8F0",
        background: selected ? d.bg : "#FFFFFF",
        cursor: d.obrig ? "default" : "pointer",
        textAlign: "left",
        fontFamily: "var(--font-body)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#071A3D",
        fontFamily: "var(--font-display)"
      }
    }, d.title), d.obrig && /*#__PURE__*/React.createElement(DSN.Tag, {
      tone: "success"
    }, "Obrigat\xF3rio")), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "4px 0 0",
        fontSize: 13,
        color: "#64748B"
      }
    }, d.desc), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "5px 0 0",
        fontSize: 11,
        color: "#94A3B8"
      }
    }, d.sections, " se\xE7\xF5es")), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: 6,
        border: `2px solid ${selected ? d.color : "#E2E8F0"}`,
        background: selected ? d.color : "#F8FAFC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 8
      }
    }, selected && /*#__PURE__*/React.createElement("svg", {
      width: "11",
      height: "11",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "white",
      strokeWidth: "3.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("polyline", {
      points: "20 6 9 17 4 12"
    }))));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#374151",
      display: "block",
      marginBottom: 12
    }
  }, "Fases Opcionais do Processo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      border: `1px solid ${verifDFD ? "#1F5FD6" : "#E2E8F0"}`,
      borderRadius: 12,
      padding: "16px 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(DSN.Toggle, {
    checked: verifDFD,
    onChange: setVerifDFD
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#071A3D",
      fontFamily: "var(--font-display)"
    }
  }, "Verifica\xE7\xE3o do DFD pela IA"), /*#__PURE__*/React.createElement(DSN.Tag, {
    tone: "info"
  }, "Antes do ETP")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 13,
      color: "#64748B"
    }
  }, "Antes de iniciar o ETP, o DFD ser\xE1 analisado pela IA que fornecer\xE1 parecer sobre qualidade, completude e compatibilidade com a legisla\xE7\xE3o.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      border: `1px solid ${retif ? "#7C3AED" : "#E2E8F0"}`,
      borderRadius: 12,
      padding: "16px 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement(DSN.Toggle, {
    checked: retif,
    onChange: setRetif,
    color: "#7C3AED"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#071A3D",
      fontFamily: "var(--font-display)"
    }
  }, "Fase de Retifica\xE7\xE3o"), /*#__PURE__*/React.createElement(DSN.Tag, {
    tone: "violet"
  }, "Opcional")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 13,
      color: "#64748B"
    }
  }, "Inclui uma fase de retifica\xE7\xE3o no fluxo do processo, permitindo a corre\xE7\xE3o de documentos ap\xF3s a gera\xE7\xE3o quando identificadas inconsist\xEAncias ou necessidade de ajustes.")))))), /*#__PURE__*/React.createElement(DSN.InfoBanner, {
    tone: "warning"
  }, "O processo ser\xE1 criado com o n\xFAmero ", /*#__PURE__*/React.createElement("strong", null, "PROC-2024-090"), ". ", verifDFD ? "Após a criação você será direcionado à verificação do DFD pela IA." : "Após a criação você será direcionado ao preenchimento do ETP.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 32
    }
  }, step > 1 && /*#__PURE__*/React.createElement(DSN.Button, {
    variant: "secondary",
    size: "lg",
    onClick: () => setStep(s => s - 1)
  }, "Voltar"), /*#__PURE__*/React.createElement(DSN.Button, {
    variant: "primary",
    size: "lg",
    disabled: !canProceed,
    onClick: () => {
      if (step < 3) setStep(s => s + 1);else navigate("etp-form", "PROC-2024-090");
    }
  }, step === 3 ? verifDFD ? "Criar Processo e Verificar DFD →" : "Criar Processo e Iniciar ETP →" : "Continuar →")));
}
Object.assign(window, {
  NewProcessScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/geradocs/NewProcessScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/geradocs/ProcessListScreen.jsx
try { (() => {
// GeraDocs UI kit — Processos list (recreation of src/views/ProcessList.tsx)
const DSP = window.GovProGeraDocsDesignSystem_11bcef;
const gdAll = [{
  id: "PROC-2024-089",
  title: "Aquisição de Equipamentos de TI",
  secretaria: "Secretaria de Educação",
  modalidade: "Pregão Eletrônico",
  status: "em_revisao",
  valor: "R$ 485.000,00",
  etp: "Completo",
  tr: "Em andamento",
  responsavel: "Maria Costa"
}, {
  id: "PROC-2024-088",
  title: "Contratação de Serviços de Limpeza",
  secretaria: "Secretaria de Obras",
  modalidade: "Pregão Eletrônico",
  status: "aguardando",
  valor: "R$ 120.000,00",
  etp: "Completo",
  tr: "Completo",
  responsavel: "João Silva"
}, {
  id: "PROC-2024-087",
  title: "Fornecimento de Material de Escritório",
  secretaria: "Administração Central",
  modalidade: "Dispensa",
  status: "aprovado",
  valor: "R$ 38.500,00",
  etp: "Completo",
  tr: "Completo",
  responsavel: "Ana Oliveira"
}, {
  id: "PROC-2024-086",
  title: "Serviços de Manutenção Predial",
  secretaria: "Secretaria de Saúde",
  modalidade: "Concorrência",
  status: "rascunho",
  valor: "R$ 210.000,00",
  etp: "Em andamento",
  tr: "Não iniciado",
  responsavel: "Carlos Lima"
}, {
  id: "PROC-2024-085",
  title: "Aquisição de Veículos Oficiais",
  secretaria: "Frota Municipal",
  modalidade: "Pregão Eletrônico",
  status: "concluido",
  valor: "R$ 920.000,00",
  etp: "Completo",
  tr: "Completo",
  responsavel: "Maria Costa"
}, {
  id: "PROC-2024-084",
  title: "Sistema de Gestão de RH",
  secretaria: "Secretaria de Adm.",
  modalidade: "Inexigibilidade",
  status: "em_revisao",
  valor: "R$ 750.000,00",
  etp: "Completo",
  tr: "Em revisão",
  responsavel: "Pedro Ramos"
}, {
  id: "PROC-2024-083",
  title: "Reforma Escola Municipal Centro",
  secretaria: "Secretaria de Educação",
  modalidade: "Concorrência",
  status: "aguardando",
  valor: "R$ 1.200.000,00",
  etp: "Completo",
  tr: "Completo",
  responsavel: "Ana Oliveira"
}, {
  id: "PROC-2024-082",
  title: "Aquisição de Uniformes Escolares",
  secretaria: "Secretaria de Educação",
  modalidade: "Pregão Eletrônico",
  status: "rejeitado",
  valor: "R$ 95.000,00",
  etp: "Completo",
  tr: "Rejeitado",
  responsavel: "João Silva"
}];
const gdFilters = [{
  key: "todos",
  label: "Todos"
}, {
  key: "rascunho",
  label: "Rascunho"
}, {
  key: "em_revisao",
  label: "Em Revisão"
}, {
  key: "aguardando",
  label: "Aguardando"
}, {
  key: "aprovado",
  label: "Aprovado"
}, {
  key: "concluido",
  label: "Concluído"
}, {
  key: "rejeitado",
  label: "Rejeitado"
}];
function ProcessListScreen({
  navigate
}) {
  const [filter, setFilter] = React.useState("todos");
  const [search, setSearch] = React.useState("");
  const filtered = gdAll.filter(p => (filter === "todos" || p.status === filter) && (search === "" || p.title.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px"
    },
    "data-screen-label": "Processos"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 260px",
      maxWidth: 320
    }
  }, /*#__PURE__*/React.createElement(DSP.SearchInput, {
    placeholder: "Buscar por t\xEDtulo ou n\xFAmero...",
    value: search,
    onChange: e => setSearch(e.target.value),
    background: "#FFFFFF",
    width: "100%"
  })), /*#__PURE__*/React.createElement(DSP.FilterTabs, {
    options: gdFilters,
    active: filter,
    onChange: setFilter
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(DSP.Button, {
    variant: "secondary"
  }, "Filtros"), /*#__PURE__*/React.createElement(DSP.Button, {
    variant: "secondary"
  }, "Exportar"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      border: "1px solid #E2E8F0",
      borderRadius: 12,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "#F8FAFC",
      borderBottom: "1px solid #E2E8F0"
    }
  }, ["Processo / Objeto", "Secretaria", "Modalidade", "Valor Est.", "ETP", "TR", "Responsável", "Status"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "11px 16px",
      textAlign: "left",
      fontSize: 11,
      color: "#94A3B8",
      fontWeight: 600,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtered.map((p, i) => /*#__PURE__*/React.createElement("tr", {
    key: p.id,
    onClick: () => navigate("etp-form", p.id),
    style: {
      borderBottom: i < filtered.length - 1 ? "1px solid #F8FAFC" : "none",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#071A3D",
      maxWidth: 260
    }
  }, p.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#94A3B8",
      fontFamily: "var(--font-mono)",
      marginTop: 3
    }
  }, p.id)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "14px 16px",
      fontSize: 12,
      color: "#64748B",
      maxWidth: 160
    }
  }, p.secretaria), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement(DSP.DocPill, {
    status: p.modalidade,
    bg: "#EDF3FD",
    color: "#1650C4"
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "14px 16px",
      fontSize: 13,
      fontWeight: 600,
      color: "#0E3A94",
      fontFamily: "var(--font-mono)",
      whiteSpace: "nowrap"
    }
  }, p.valor), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement(DSP.DocPill, {
    status: p.etp
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement(DSP.DocPill, {
    status: p.tr
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "14px 16px",
      fontSize: 12,
      color: "#64748B"
    }
  }, p.responsavel), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement(DSP.StatusBadge, {
    status: p.status,
    size: "sm"
  })))))), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 60,
      textAlign: "center",
      color: "#94A3B8"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 500
    }
  }, "Nenhum processo encontrado")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderTop: "1px solid #F1F5F9",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#94A3B8"
    }
  }, "Exibindo ", filtered.length, " de ", gdAll.length, " processos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, [1, 2, 3].map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    style: {
      width: 30,
      height: 30,
      borderRadius: 6,
      border: "1px solid #E2E8F0",
      background: p === 1 ? "#071A3D" : "#FFFFFF",
      color: p === 1 ? "#FFFFFF" : "#64748B",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, p))))));
}
Object.assign(window, {
  ProcessListScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/geradocs/ProcessListScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Toggle = __ds_scope.Toggle;

__ds_ns.Header = __ds_scope.Header;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.DocPill = __ds_scope.DocPill;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.ValidationMsg = __ds_scope.ValidationMsg;

__ds_ns.InfoBanner = __ds_scope.InfoBanner;

__ds_ns.ChoiceCard = __ds_scope.ChoiceCard;

__ds_ns.CheckMark = __ds_scope.CheckMark;

__ds_ns.FileUpload = __ds_scope.FileUpload;

__ds_ns.FormField = __ds_scope.FormField;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.FilterTabs = __ds_scope.FilterTabs;

__ds_ns.SectionBlock = __ds_scope.SectionBlock;

__ds_ns.CardPanel = __ds_scope.CardPanel;

__ds_ns.StepIndicator = __ds_scope.StepIndicator;

})();
