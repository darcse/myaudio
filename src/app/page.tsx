export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <h1 className="text-3xl font-bold tracking-tight">MyAudio</h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        개인 음악·헤드파이 라이브러리
      </p>
    </main>
  );
}
