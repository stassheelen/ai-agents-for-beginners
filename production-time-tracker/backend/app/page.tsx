export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "64px auto", padding: "0 24px" }}>
      <h1 style={{ fontWeight: 600 }}>Фіксатор часу — API</h1>
      <p style={{ color: "#6e6e73" }}>Сервер працює. Ендпоінти (потрібен заголовок x-api-key):</p>
      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <code>POST /api/events</code> — пакет подій з планшета
        </li>
        <li>
          <code>GET /api/products</code> — довідник продукції
        </li>
        <li>
          <code>GET /api/health</code> — стан API та SharePoint
        </li>
      </ul>
    </main>
  );
}
