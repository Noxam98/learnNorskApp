// Разделитель «—— или ——» между формой и кнопкой входа через Google.
export const AuthDivider = ({ label }) => (
    <div style={{
        display: "flex", alignItems: "center", gap: "var(--sp-3)",
        margin: "var(--sp-4) 0", color: "var(--muted-2)", fontSize: "var(--fs-13)",
    }}>
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
        {label}
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
);
