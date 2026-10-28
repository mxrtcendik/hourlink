export function OgCard({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#141311",
        color: "#f3f0e8",
        padding: "72px",
      }}
    >
      <div style={{ display: "flex", fontSize: 22, letterSpacing: "0.12em", color: "#a39e93" }}>
        {eyebrow}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 28 ? 64 : 80,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 22, fontSize: 32, color: "#a39e93" }}>{detail}</div>
      </div>
      <div style={{ display: "flex", fontSize: 28, color: "#a39e93" }}>Opens in your timezone</div>
    </div>
  );
}
