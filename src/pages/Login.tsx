import { useState, FormEvent, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo-tecworld.png";

/* ─────────────────────── circuit-board canvas ────────────────────────── */
function CircuitCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    const SPACING = 52;

    interface Line { x1: number; y1: number; x2: number; y2: number }
    interface Pulse { lineIdx: number; t: number; speed: number; size: number; opacity: number }

    let cols: number[] = [];
    let rows: number[] = [];
    let lines: Line[] = [];
    let pulses: Pulse[] = [];
    let dpr = 1;

    function buildGrid() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      cols = []; rows = []; lines = [];
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;

      for (let x = SPACING; x < W; x += SPACING) cols.push(x);
      for (let y = SPACING; y < H; y += SPACING) rows.push(y);

      for (const y of rows) {
        for (let i = 0; i < cols.length - 1; i += 2 + Math.floor(Math.random() * 2)) {
          lines.push({ x1: cols[i], y1: y, x2: cols[i + 1], y2: y });
        }
      }
      for (const x of cols) {
        for (let i = 0; i < rows.length - 1; i += 2 + Math.floor(Math.random() * 2)) {
          lines.push({ x1: x, y1: rows[i], x2: x, y2: rows[i + 1] });
        }
      }

      pulses = Array.from({ length: 40 }, () => ({
        lineIdx: Math.floor(Math.random() * lines.length),
        t: Math.random(),
        speed: 0.002 + Math.random() * 0.004,
        size: 1.5 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.5,
      }));
    }

    function draw() {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(255, 204, 0, 0.045)";
      ctx.lineWidth = 0.5;
      for (const l of lines) {
        ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
      }

      ctx.fillStyle = "rgba(255, 204, 0, 0.07)";
      for (const x of cols) for (const y of rows) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
      }

      for (const p of pulses) {
        const l = lines[p.lineIdx]; if (!l) continue;
        p.t += p.speed;
        if (p.t > 1) { p.t = 0; p.lineIdx = Math.floor(Math.random() * lines.length); }

        const x = l.x1 + (l.x2 - l.x1) * p.t;
        const y = l.y1 + (l.y2 - l.y1) * p.t;

        const g = ctx.createRadialGradient(x, y, 0, x, y, p.size * 5);
        g.addColorStop(0, `rgba(255, 204, 0, ${p.opacity * 0.7})`);
        g.addColorStop(1, "rgba(255,204,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, p.size * 5, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `rgba(255,204,0,${p.opacity})`;
        ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    }

    buildGrid();
    draw();

    const ro = new ResizeObserver(buildGrid);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}

/* ──────────────────────────── login page ──────────────────────────────── */
export default function Login() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError]           = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err: any) {
      const code: string = err?.code ?? "";
      if (["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(code)) {
        setError("E-mail ou senha incorretos.");
      } else if (code === "auth/too-many-requests") {
        setError("Muitas tentativas. Tente novamente em instantes.");
      } else if (code === "auth/network-request-failed") {
        setError("Sem conexão com a internet.");
      } else {
        setError("Erro ao entrar. Verifique suas credenciais.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "#060608" }}>

      {/* ── LEFT PANEL (decorative, hidden on mobile) ── */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center overflow-hidden">
        <CircuitCanvas />

        {/* diagonal yellow slice */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            background: "#FFCC00",
            clipPath: "polygon(62% 0,100% 0,100% 100%,45% 100%)",
          }}
        />

        {/* bottom stripe */}
        <div
          className="absolute bottom-0 left-0 w-full h-[5px]"
          style={{
            background:
              "repeating-linear-gradient(135deg,#FFCC00 0,#FFCC00 10px,transparent 10px,transparent 18px)",
          }}
        />

        {/* centre branding */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 select-none">
          {/* hex ring decoration */}
          <svg className="absolute opacity-[0.06] w-[420px] h-[420px]" viewBox="0 0 300 300">
            <polygon points="150,10 280,80 280,220 150,290 20,220 20,80" fill="none" stroke="#FFCC00" strokeWidth="1.5"/>
            <polygon points="150,38 258,100 258,200 150,262 42,200 42,100" fill="none" stroke="#FFCC00" strokeWidth="0.8"/>
            <polygon points="150,68 235,118 235,182 150,232 65,182 65,118" fill="none" stroke="#FFCC00" strokeWidth="0.4"/>
          </svg>

          {/* radial glow behind logo */}
          <div className="absolute w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,204,0,0.08) 0%, transparent 70%)" }} />

          <img src={logo} alt="TecWorld" className="relative h-24 w-24 rounded-3xl shadow-2xl mb-6" style={{ boxShadow: "0 0 40px rgba(255,204,0,0.25)" }} />

          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-8" style={{ background: "#FFCC00" }} />
            <span className="text-[10px] tracking-[4px] uppercase font-medium" style={{ color: "#FFCC00" }}>
              Sistema Interno
            </span>
            <span className="h-px w-8" style={{ background: "#FFCC00" }} />
          </div>

          <h1
            className="font-display text-6xl font-black uppercase tracking-tighter leading-none mb-3"
            style={{ color: "#FFCC00" }}
          >
            TecWorld
          </h1>
          <p className="text-sm font-medium max-w-xs leading-relaxed" style={{ color: "#555" }}>
            Painel financeiro exclusivo para gestão de vendas, estoque e relatórios.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div
        className="w-full lg:w-[420px] xl:w-[460px] flex flex-col relative overflow-hidden"
        style={{ background: "#0a0a0e", borderLeft: "1px solid rgba(255,204,0,0.07)" }}
      >
        {/* subtle top accent */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,204,0,0.4),transparent)" }} />

        {/* mobile canvas (shows when left panel is hidden) */}
        <div className="absolute inset-0 lg:hidden opacity-50 pointer-events-none">
          <CircuitCanvas />
        </div>

        {/* form area */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-8 sm:px-12 py-12">

          {/* mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <img src={logo} alt="TecWorld" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="font-display font-black text-xl uppercase tracking-tighter leading-none" style={{ color: "#FFCC00" }}>TecWorld</p>
              <p className="text-[10px] tracking-widest uppercase font-medium mt-0.5" style={{ color: "#555" }}>Financeiro</p>
            </div>
          </div>

          {/* heading */}
          <div className="mb-8">
            <h2 className="font-display font-black text-3xl xl:text-4xl uppercase tracking-tighter text-white leading-tight">
              Acesso ao<br />
              <span style={{ color: "#FFCC00" }}>Painel</span>
            </h2>
            <p className="text-sm mt-2" style={{ color: "#555" }}>
              Entre com suas credenciais para continuar.
            </p>
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#555" }}>
                E-mail
              </label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 rounded-xl text-sm font-medium text-white placeholder:text-[#333] focus:outline-none transition-all"
                style={{
                  background: "#111116",
                  border: "1px solid #1e1e26",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,204,0,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,204,0,0.06)"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = "#1e1e26"; e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.4)"; }}
              />
            </div>

            {/* password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#555" }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-sm font-medium text-white placeholder:text-[#333] focus:outline-none transition-all"
                  style={{
                    background: "#111116",
                    border: "1px solid #1e1e26",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,204,0,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,204,0,0.06)"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "#1e1e26"; e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.4)"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors"
                  style={{ color: "#444" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FFCC00")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* error */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-medium text-center"
                style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171" }}
              >
                {error}
              </div>
            )}

            {/* submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 w-full py-4 font-black text-sm uppercase tracking-widest text-black overflow-hidden transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "#FFCC00",
                clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 100%, 0 100%)",
                boxShadow: loading ? "none" : "0 8px 30px rgba(255,204,0,0.25)",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar no Sistema ›"
              )}
            </button>
          </form>

          {/* divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "#1e1e26" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#333" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "#1e1e26" }} />
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            disabled={loadingGoogle || loading}
            onClick={async () => {
              setError("");
              setLoadingGoogle(true);
              try {
                await signInWithGoogle();
                navigate("/", { replace: true });
              } catch (err: any) {
                const code: string = err?.code ?? "";
                if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
                  // user closed popup — silently ignore
                } else if (code === "auth/network-request-failed") {
                  setError("Sem conexão com a internet.");
                } else {
                  setError("Erro ao entrar com Google.");
                }
              } finally {
                setLoadingGoogle(false);
              }
            }}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "#111116",
              border: "1px solid #1e1e26",
              color: "#ccc",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,204,0,0.3)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1e1e26";
              e.currentTarget.style.color = "#ccc";
            }}
          >
            {loadingGoogle ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loadingGoogle ? "Aguardando Google..." : "Continuar com Google"}
          </button>

          {/* footer note */}
          <p className="mt-8 text-[11px] text-center" style={{ color: "#2a2a32" }}>
            Acesso restrito · TecWorld &copy; {new Date().getFullYear()}
          </p>
        </div>

        {/* bottom stripe */}
        <div
          className="absolute bottom-0 left-0 w-full h-[3px]"
          style={{ background: "repeating-linear-gradient(135deg,#FFCC00 0,#FFCC00 8px,transparent 8px,transparent 14px)" }}
        />
      </div>
    </div>
  );
}
