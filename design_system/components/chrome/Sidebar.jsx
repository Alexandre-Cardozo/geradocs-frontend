import React, { useState } from "react";

// Logo oficial (assets/geradocs-logo-white.svg) embutido: o componente roda em cards,
// no UI kit e no standalone, cada um num caminho diferente.
const GERADOCS_LOGO_ESCURO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NzMuMTQgMTAwIiB3aWR0aD0iNDczLjE0IiBoZWlnaHQ9IjEwMCIgcm9sZT0iaW1nIiBhcmlhLWxhYmVsPSJHZXJhRG9jcyI+Cjx0aXRsZT5HZXJhRG9jczwvdGl0bGU+CjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xMi43OSAtOS4zKSBzY2FsZSgxLjE2MjgpIj48cGF0aCBmaWxsPSIjNEM5M0ZGIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zNCA4SDU4TDg4IDM4Vjk0SDM0QTIwIDIwIDAgMCAxIDE0IDc0VjI4QTIwIDIwIDAgMCAxIDM0IDhaTTMyIDI0QTIgMiAwIDAgMCAzMCAyNlY3NkEyIDIgMCAwIDAgMzIgNzhINzJWNDQuNkw1MS40IDI0WiIvPgogICAgPGNsaXBQYXRoIGlkPSJkYTQ0MiI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzQgOEg1OEw4OCAzOFY5NEgzNEEyMCAyMCAwIDAgMSAxNCA3NFYyOEEyMCAyMCAwIDAgMSAzNCA4Wk0zMiAyNEEyIDIgMCAwIDAgMzAgMjZWNzZBMiAyIDAgMCAwIDMyIDc4SDcyVjQ0LjZMNTEuNCAyNFoiLz48L2NsaXBQYXRoPgogICAgPGcgY2xpcC1wYXRoPSJ1cmwoI2RhNDQyKSI+PHBhdGggZmlsbD0iIzFGNUZENiIgZD0iTTE0IDcwUTE2IDI4IDU2IDI0TDMwIDI0TDMwIDc4WiIvPjxwYXRoIGZpbGw9IiMyRTZGRTYiIGQ9Ik04OCA2Mkw4OCAxMDBMMCAxMDBMMCA5NFoiLz48L2c+CiAgICA8cGF0aCBmaWxsPSIjRkZEMjREIiBkPSJNNjUgOEg5NEw3OS41IDIyLjVaIi8+PHBhdGggZmlsbD0iIzJCQzA2MiIgZD0iTTk0IDhWMzdMNzkuNSAyMi41WiIvPgogICAgPHJlY3QgeD0iMzgiIHk9IjQ0IiB3aWR0aD0iMjUiIGhlaWdodD0iOCIgcng9IjQiIGZpbGw9IiM0QzkzRkYiLz4KICAgIDxyZWN0IHg9IjM4IiB5PSI1OCIgd2lkdGg9IjE1IiBoZWlnaHQ9IjgiIHJ4PSI0IiBmaWxsPSIjNEM5M0ZGIi8+PC9nPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEyNC4wNiA3MCkiPjxwYXRoIGZpbGw9IiNGRkZGRkYiIGQ9Ik0yNC4wMCAwLjgwTDI0LjAwIDAuODBRMTkuMjYgMC44MCAxNS4yMC0wLjcxUTExLjE0LTIuMjMgOC4yMC01LjAzUTUuMjYtNy44MyAzLjYwLTExLjYzUTEuOTQtMTUuNDMgMS45NC0yMC4wMFExLjk0LTI0LjU3IDMuNjAtMjguMzdRNS4yNi0zMi4xNyA4LjIzLTM0Ljk3UTExLjIwLTM3Ljc3IDE1LjI5LTM5LjI5UTE5LjM3LTQwLjgwIDI0LjIzLTQwLjgwTDI0LjIzLTQwLjgwUTI5Ljg5LTQwLjgwIDM0LjM0LTM4LjkxUTM4LjgwLTM3LjAzIDQxLjcxLTMzLjQ5TDQxLjcxLTMzLjQ5TDM0LjUxLTI2Ljk3UTMyLjQ2LTI5LjIwIDMwLjA5LTMwLjMxUTI3LjcxLTMxLjQzIDI0LjgwLTMxLjQzTDI0LjgwLTMxLjQzUTIyLjIzLTMxLjQzIDIwLjExLTMwLjYzUTE4LTI5LjgzIDE2LjUxLTI4LjMxUTE1LjAzLTI2LjgwIDE0LjIwLTI0LjcxUTEzLjM3LTIyLjYzIDEzLjM3LTIwLjAwTDEzLjM3LTIwLjAwUTEzLjM3LTE3LjQ5IDE0LjIwLTE1LjM3UTE1LjAzLTEzLjI2IDE2LjUxLTExLjc0UTE4LTEwLjIzIDIwLjA5LTkuNDBRMjIuMTctOC41NyAyNC42OS04LjU3UTI3LjIwLTguNTcgMjkuNjAtOS40M0wyOS42MC05LjQzUTMwLjE3LTkuNjAgMzAuODAtOS44OUwzMC44MC05Ljg5TDMwLjgwLTIwLjg2TDQwLjgwLTIwLjg2TDQwLjgwLTQuMjlRMzcuMzctMS44MyAzMi44Ni0wLjUxUTI4LjM0IDAuODAgMjQuMDAgMC44MFpNNTkuNzctMTYuMDZMNTkuNzctOC43NEw4MC42OS04Ljc0TDgwLjY5IDBMNDguNTcgMEw0OC41Ny00MC4wMEw3OS45NC00MC4wMEw3OS45NC0zMS4yNkw1OS43Ny0zMS4yNkw1OS43Ny0yNC41MUw3Ny41NC0yNC41MUw3Ny41NC0xNi4wNkw1OS43Ny0xNi4wNlpNOTguODYgMEw4Ny41NCAwTDg3LjU0LTQwLjAwTDEwNS44My00MC4wMFExMTEuMzEtNDAuMDAgMTE1LjI5LTM4LjIzUTExOS4yNi0zNi40NiAxMjEuNDMtMzMuMTFRMTIzLjYwLTI5Ljc3IDEyMy42MC0yNS4yMEwxMjMuNjAtMjUuMjBRMTIzLjYwLTIwLjY5IDEyMS40My0xNy40M0wxMjEuNDMtMTcuNDNRMTE5LjM3LTE0LjI5IDExNS43Ny0xMi41N0wxMTUuNzctMTIuNTdMMTI0LjQwIDBMMTEyLjI5IDBMMTA1LjAzLTEwLjYzTDk4Ljg2LTEwLjYzTDk4Ljg2IDBaTTk4Ljg2LTMxLjA5TDk4Ljg2LTE5LjM3TDEwNS4xNC0xOS4zN1ExMDguNjktMTkuMzcgMTEwLjQzLTIwLjkxUTExMi4xNy0yMi40NiAxMTIuMTctMjUuMjBMMTEyLjE3LTI1LjIwUTExMi4xNy0yOC4wMCAxMTAuNDMtMjkuNTRRMTA4LjY5LTMxLjA5IDEwNS4xNC0zMS4wOUwxMDUuMTQtMzEuMDlMOTguODYtMzEuMDlaTTEzNy4xNCAwTDEyNS42MCAwTDE0My4yNi00MC4wMEwxNTQuNDAtNDAuMDBMMTcyLjExIDBMMTYwLjM0IDBMMTU3LjIwLTcuNzdMMTQwLjI5LTcuNzdMMTM3LjE0IDBaTTE0My42MC0xNi4xMUwxNTMuODktMTYuMTFMMTQ4Ljc0LTI4LjkxTDE0My42MC0xNi4xMVoiLz48cGF0aCBmaWxsPSIjNEM5M0ZGIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNzEuODkgMCkiIGQ9Ik0yMi45MSAwTDQgMEw0LTQwLjAwTDIyLjkxLTQwLjAwUTI5LjU0LTQwLjAwIDM0LjU3LTM3LjU0UTM5LjYwLTM1LjA5IDQyLjQzLTMwLjYzUTQ1LjI2LTI2LjE3IDQ1LjI2LTIwLjAwTDQ1LjI2LTIwLjAwUTQ1LjI2LTEzLjg5IDQyLjQzLTkuNDBRMzkuNjAtNC45MSAzNC41Ny0yLjQ2UTI5LjU0IDAgMjIuOTEgMEwyMi45MSAwWk0xNS4zMS0zMC45N0wxNS4zMS05LjAzTDIyLjQ2LTkuMDNRMjUuODktOS4wMyAyOC40My0xMC4zMVEzMC45Ny0xMS42MCAzMi40MC0xNC4wOVEzMy44My0xNi41NyAzMy44My0yMC4wMEwzMy44My0yMC4wMFEzMy44My0yMy40OSAzMi40MC0yNS45NFEzMC45Ny0yOC40MCAyOC40My0yOS42OVEyNS44OS0zMC45NyAyMi40Ni0zMC45N0wyMi40Ni0zMC45N0wxNS4zMS0zMC45N1pNNzEuOTQgMC44MEw3MS45NCAwLjgwUTY3LjE0IDAuODAgNjMuMDktMC43NFE1OS4wMy0yLjI5IDU2LjAzLTUuMTFRNTMuMDMtNy45NCA1MS4zNy0xMS43MVE0OS43MS0xNS40OSA0OS43MS0yMC4wMEw0OS43MS0yMC4wMFE0OS43MS0yNC41MSA1MS4zNy0yOC4yOVE1My4wMy0zMi4wNiA1Ni4wMy0zNC44OVE1OS4wMy0zNy43MSA2My4wOS0zOS4yNlE2Ny4xNC00MC44MCA3MS45NC00MC44MEw3MS45NC00MC44MFE3Ni44MC00MC44MCA4MC44My0zOS4yNlE4NC44Ni0zNy43MSA4Ny44My0zNC44OVE5MC44MC0zMi4wNiA5Mi40OS0yOC4yOVE5NC4xNy0yNC41MSA5NC4xNy0yMC4wMEw5NC4xNy0yMC4wMFE5NC4xNy0xNS40OSA5Mi40OS0xMS42OVE5MC44MC03Ljg5IDg3LjgzLTUuMDlRODQuODYtMi4yOSA4MC44My0wLjc0UTc2LjgwIDAuODAgNzEuOTQgMC44MFpNNzEuOTQtOC41N0w3MS45NC04LjU3UTc0LjIzLTguNTcgNzYuMjAtOS4zN1E3OC4xNy0xMC4xNyA3OS42My0xMS42OVE4MS4wOS0xMy4yMCA4MS45MS0xNS4zMVE4Mi43NC0xNy40MyA4Mi43NC0yMC4wMEw4Mi43NC0yMC4wMFE4Mi43NC0yMi42MyA4MS45MS0yNC43MVE4MS4wOS0yNi44MCA3OS42My0yOC4zMVE3OC4xNy0yOS44MyA3Ni4yMC0zMC42M1E3NC4yMy0zMS40MyA3MS45NC0zMS40M0w3MS45NC0zMS40M1E2OS42Ni0zMS40MyA2Ny42OS0zMC42M1E2NS43MS0yOS44MyA2NC4yNi0yOC4zMVE2Mi44MC0yNi44MCA2MS45Ny0yNC43MVE2MS4xNC0yMi42MyA2MS4xNC0yMC4wMEw2MS4xNC0yMC4wMFE2MS4xNC0xNy40MyA2MS45Ny0xNS4zMVE2Mi44MC0xMy4yMCA2NC4yNi0xMS42OVE2NS43MS0xMC4xNyA2Ny42OS05LjM3UTY5LjY2LTguNTcgNzEuOTQtOC41N1pNMTIwLjYzIDAuODBMMTIwLjYzIDAuODBRMTE1Ljg5IDAuODAgMTExLjg2LTAuNzFRMTA3LjgzLTIuMjMgMTA0Ljg5LTUuMDNRMTAxLjk0LTcuODMgMTAwLjI5LTExLjYzUTk4LjYzLTE1LjQzIDk4LjYzLTIwLjAwTDk4LjYzLTIwLjAwUTk4LjYzLTI0LjU3IDEwMC4yOS0yOC4zN1ExMDEuOTQtMzIuMTcgMTA0Ljg5LTM0Ljk3UTEwNy44My0zNy43NyAxMTEuODYtMzkuMjlRMTE1Ljg5LTQwLjgwIDEyMC42My00MC44MEwxMjAuNjMtNDAuODBRMTI2LjE3LTQwLjgwIDEzMC41NC0zOC44NlExMzQuOTEtMzYuOTEgMTM3LjgzLTMzLjI2TDEzNy44My0zMy4yNkwxMzAuNjMtMjYuNzRRMTI4LjY5LTI5LjAzIDEyNi4zNy0zMC4yM1ExMjQuMDYtMzEuNDMgMTIxLjIwLTMxLjQzTDEyMS4yMC0zMS40M1ExMTguNzQtMzEuNDMgMTE2LjY5LTMwLjYzUTExNC42My0yOS44MyAxMTMuMTctMjguMzFRMTExLjcxLTI2LjgwIDExMC44OS0yNC42OVExMTAuMDYtMjIuNTcgMTEwLjA2LTIwLjAwTDExMC4wNi0yMC4wMFExMTAuMDYtMTcuNDMgMTEwLjg5LTE1LjMxUTExMS43MS0xMy4yMCAxMTMuMTctMTEuNjlRMTE0LjYzLTEwLjE3IDExNi42OS05LjM3UTExOC43NC04LjU3IDEyMS4yMC04LjU3TDEyMS4yMC04LjU3UTEyNC4wNi04LjU3IDEyNi4zNy05Ljc3UTEyOC42OS0xMC45NyAxMzAuNjMtMTMuMjZMMTMwLjYzLTEzLjI2TDEzNy44My02Ljc0UTEzNC45MS0zLjE0IDEzMC41NC0xLjE3UTEyNi4xNyAwLjgwIDEyMC42MyAwLjgwWk0xNTcuNDkgMC44MEwxNTcuNDkgMC44MFExNTIuNTcgMC44MCAxNDguMDMtMC40M1ExNDMuNDktMS42NiAxNDAuNjMtMy42MEwxNDAuNjMtMy42MEwxNDQuMzQtMTEuOTRRMTQ3LjAzLTEwLjIzIDE1MC41NC05LjExUTE1NC4wNi04IDE1Ny41NC04TDE1Ny41NC04UTE1OS44OS04IDE2MS4zMS04LjQzUTE2Mi43NC04Ljg2IDE2My40MC05LjU3UTE2NC4wNi0xMC4yOSAxNjQuMDYtMTEuMjZMMTY0LjA2LTExLjI2UTE2NC4wNi0xMi42MyAxNjIuODAtMTMuNDNRMTYxLjU0LTE0LjIzIDE1OS41NC0xNC43NFExNTcuNTQtMTUuMjYgMTU1LjExLTE1Ljc3UTE1Mi42OS0xNi4yOSAxNTAuMjYtMTcuMDlRMTQ3LjgzLTE3Ljg5IDE0NS44My0xOS4xN1ExNDMuODMtMjAuNDYgMTQyLjU3LTIyLjU0UTE0MS4zMS0yNC42MyAxNDEuMzEtMjcuODNMMTQxLjMxLTI3LjgzUTE0MS4zMS0zMS40MyAxNDMuMjktMzQuMzRRMTQ1LjI2LTM3LjI2IDE0OS4yMC0zOS4wM1ExNTMuMTQtNDAuODAgMTU5LjAzLTQwLjgwTDE1OS4wMy00MC44MFExNjIuOTctNDAuODAgMTY2Ljc3LTM5LjkxUTE3MC41Ny0zOS4wMyAxNzMuNTQtMzcuMzFMMTczLjU0LTM3LjMxTDE3MC4wNi0yOC45MVExNjcuMjAtMzAuNDYgMTY0LjQwLTMxLjIzUTE2MS42MC0zMiAxNTguOTctMzJMMTU4Ljk3LTMyUTE1Ni42My0zMiAxNTUuMjAtMzEuNTFRMTUzLjc3LTMxLjAzIDE1My4xNC0zMC4yM1ExNTIuNTEtMjkuNDMgMTUyLjUxLTI4LjQwTDE1Mi41MS0yOC40MFExNTIuNTEtMjcuMDkgMTUzLjc0LTI2LjMxUTE1NC45Ny0yNS41NCAxNTctMjUuMDZRMTU5LjAzLTI0LjU3IDE2MS40Ni0yNC4wNlExNjMuODktMjMuNTQgMTY2LjMxLTIyLjc3UTE2OC43NC0yMi4wMCAxNzAuNzQtMjAuNzFRMTcyLjc0LTE5LjQzIDE3My45Ny0xNy4zNFExNzUuMjAtMTUuMjYgMTc1LjIwLTEyLjExTDE3NS4yMC0xMi4xMVExNzUuMjAtOC42MyAxNzMuMjMtNS42OVExNzEuMjYtMi43NCAxNjcuMzQtMC45N1ExNjMuNDMgMC44MCAxNTcuNDkgMC44MFoiLz48L2c+Cjwvc3ZnPgo=";

const icons = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  processes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
  approvals: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  documents: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></svg>,
};

function NavButton({ item, isActive, onClick, dim }) {
  const [hover, setHover] = useState(false);
  const inactive = dim ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.55)";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px",
        borderRadius: 8, border: "none", cursor: "pointer",
        background: isActive ? "rgba(37,99,235,0.18)" : hover ? "rgba(255,255,255,0.06)" : "transparent",
        color: isActive || hover ? "#FFFFFF" : inactive,
        fontSize: 13, fontWeight: isActive ? 600 : 500, textAlign: "left",
        transition: "all 0.15s", position: "relative", marginBottom: 2, fontFamily: "var(--font-body)",
      }}
    >
      {isActive && (
        <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, background: "#38BDF8", borderRadius: "0 3px 3px 0" }} />
      )}
      <span style={{ color: "inherit", display: "flex" }}>{icons[item.view] || item.icon}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span style={{ background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{item.badge}</span>
      )}
    </button>
  );
}

/**
 * GeraDocs navy app sidebar: brand chip, órgão switcher, nav sections, user row.
 * Faithful port of src/components/Sidebar.tsx (wordmark updated to GeraDocs).
 */
export function Sidebar({
  currentView = "dashboard",
  navigate,
  items = [
    { view: "dashboard", label: "Dashboard" },
    { view: "processes", label: "Processos" },
    { view: "approvals", label: "Aprovações", badge: 3 },
    { view: "documents", label: "Documentos" },
  ],
  bottomItems = [{ view: "settings", label: "Configurações" }],
  orgName = "Prefeitura de São Paulo",
  orgUnit = "Secretaria de Compras",
  userName = "Maria Costa",
  userRole = "Servidor · Compras",
  userInitials = "MC",
}) {
  const go = (v) => navigate && navigate(v);
  return (
    <aside style={{ width: 240, minWidth: 240, background: "#071A3D", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <img src={GERADOCS_LOGO_ESCURO} alt="GeraDocs" style={{ height: 32, display: "block" }} />
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", marginTop: 6 }}>Uma solução GovPro</div>
      </div>

      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 6 }}>Órgão Atual</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
          <div style={{ width: 22, height: 22, background: "rgba(37,99,235,0.4)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5">
              <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{orgName}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{orgUnit}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", padding: "4px 8px", marginBottom: 4 }}>Principal</div>
        {items.map((item) => (
          <NavButton key={item.view} item={item} onClick={() => go(item.view)}
            isActive={currentView === item.view || (item.view === "processes" && currentView === "etp-form")} />
        ))}
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase", padding: "4px 8px", marginBottom: 4, marginTop: 16 }}>Sistema</div>
        {bottomItems.map((item) => (
          <NavButton key={item.view} item={item} dim onClick={() => go(item.view)} isActive={currentView === item.view} />
        ))}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, background: "linear-gradient(135deg, #0D3B66, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{userInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#FFFFFF", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{userRole}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
            <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
