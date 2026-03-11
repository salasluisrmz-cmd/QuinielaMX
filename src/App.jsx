import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const TEMPORADA = "Clausura 2026";
const JORNADA_ACTUAL = 11;

// ─── PARTIDOS JORNADA 11 (fuente: ESPN / TUDN / RÉCORD — 8 Mar 2026) ────────
const PARTIDOS_J11 = [
  { id:1, jornada:11, local:{nombre:"Puebla",escudo:"⚽",color:"#1565C0"}, visitante:{nombre:"Necaxa",escudo:"⚽",color:"#D50000"}, fecha:"Vie 13 Mar",hora:"19:00",estadio:"Estadio Cuauhtémoc" },
  { id:2, jornada:11, local:{nombre:"FC Juárez",escudo:"⚽",color:"#212121"}, visitante:{nombre:"Monterrey",escudo:"⚽",color:"#003DA5"}, fecha:"Vie 13 Mar",hora:"21:00",estadio:"Est. Olímpico Benito Juárez" },
  { id:3, jornada:11, local:{nombre:"Atlético San Luis",escudo:"⚽",color:"#C62828"}, visitante:{nombre:"Pachuca",escudo:"⚽",color:"#1565C0"}, fecha:"Sáb 14 Mar",hora:"17:00",estadio:"Est. Alfonso Lastras" },
  { id:4, jornada:11, local:{nombre:"Guadalajara",escudo:"⚽",color:"#CC0000"}, visitante:{nombre:"Santos Laguna",escudo:"⚽",color:"#2E7D32"}, fecha:"Sáb 14 Mar",hora:"17:07",estadio:"Estadio Akron" },
  { id:5, jornada:11, local:{nombre:"León",escudo:"⚽",color:"#B8860B"}, visitante:{nombre:"Tijuana",escudo:"⚽",color:"#212121"}, fecha:"Sáb 14 Mar",hora:"19:00",estadio:"Estadio León" },
  { id:6, jornada:11, local:{nombre:"Toluca",escudo:"⚽",color:"#B71C1C"}, visitante:{nombre:"Atlas",escudo:"⚽",color:"#CC4400"}, fecha:"Sáb 14 Mar",hora:"19:00",estadio:"Est. Nemesio Díez" },
  { id:7, jornada:11, local:{nombre:"Pumas UNAM",escudo:"⚽",color:"#C8A400"}, visitante:{nombre:"Cruz Azul",escudo:"⚽",color:"#1E5EFF"}, fecha:"Sáb 14 Mar",hora:"21:00",estadio:"Est. Olímpico CU" },
  { id:8, jornada:11, local:{nombre:"Tigres UANL",escudo:"⚽",color:"#FFD000"}, visitante:{nombre:"Querétaro",escudo:"⚽",color:"#1B5E20"}, fecha:"Dom 15 Mar",hora:"17:00",estadio:"Est. Universitario" },
  { id:9, jornada:11, local:{nombre:"América",escudo:"⚽",color:"#F5A623"}, visitante:{nombre:"Mazatlán",escudo:"⚽",color:"#FF6F00"}, fecha:"Dom 15 Mar",hora:"19:00",estadio:"Estadio Azteca" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const formatCountdown = (ms) => {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
};
const getPickClass = (sel, opt) => {
  if (opt === "1" && sel === "1") return "pick-btn sel-1";
  if (opt === "X" && sel === "X") return "pick-btn sel-x";
  if (opt === "2" && sel === "2") return "pick-btn sel-2";
  return "pick-btn";
};
const getResultColor = (r) => {
  if (r === "1") return "result-1";
  if (r === "X") return "result-x";
  if (r === "2") return "result-2";
  return "";
};

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
const ProgressRing = ({ filled, total }) => {
  const R = 31, C = 2 * Math.PI * R;
  const offset = C * (1 - (total === 0 ? 0 : filled / total));
  return (
    <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
      <svg viewBox="0 0 90 90" style={{ width:90, height:90 }}>
        <defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f0b429"/><stop offset="100%" stopColor="#00c98d"/></linearGradient></defs>
        <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
        <circle cx="45" cy="45" r={R} fill="none" stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} style={{ transform:"rotate(-90deg)", transformOrigin:"center", transition:"stroke-dashoffset 0.5s ease" }}/>
        <text x="45" y="42" textAnchor="middle" dominantBaseline="central" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.3rem", fill:"#eef2ff" }}>{filled}/{total}</text>
        <text x="45" y="54" textAnchor="middle" style={{ fontSize:"0.45rem", fill:"#5a6a8a", letterSpacing:2 }}>LLENADOS</text>
      </svg>
    </div>
  );
};

const PartidoCard = ({ partido, pick, onPick, index }) => (
  <div className={`partido-card ${pick ? "filled" : ""}`} style={{ animationDelay: `${index * 60}ms` }}>
    <div className="partido-meta">
      <span className="liga-badge">Liga BBVA MX</span>
      <div className="partido-info"><span>📅 {partido.fecha}</span><span>⏰ {partido.hora}</span><span>📍 {partido.estadio}</span></div>
    </div>
    <div className="match-row">
      <div className="team"><div className="team-escudo">{partido.local.escudo}</div><div><div className="team-name">{partido.local.nombre}</div><div className="team-record">Local</div></div></div>
      <div className="vs-block"><span className="vs-text">VS</span><span className="match-time">{partido.hora}</span></div>
      <div className="team visitante"><div className="team-escudo">{partido.visitante.escudo}</div><div><div className="team-name">{partido.visitante.nombre}</div><div className="team-record">Visitante</div></div></div>
    </div>
    <div className="picks-row">
      {["1","X","2"].map((opt) => (
        <button key={opt} className={getPickClass(pick, opt)} onClick={() => onPick(partido.id, opt)}>
          {pick === opt && <span className="pick-check">✓</span>}
          <span className="pick-label">{opt}</span>
          <span className="pick-desc">{opt === "1" ? partido.local.nombre : opt === "2" ? partido.visitante.nombre : "Empate"}</span>
        </button>
      ))}
    </div>
  </div>
);

const Header = ({ jornada, user, onLogout }) => (
  <header className="site-header">
    <div className="header-inner">
      <div className="brand"><div className="brand-icon">⚽</div><div><div className="brand-name">QUINIELA MX</div><div className="brand-sub">Liga BBVA MX · {TEMPORADA}</div></div></div>
      <div className="header-right">
        <div className="torneo-pill">Jornada {jornada || "..."}</div>
        {user && <button className="logout-btn" onClick={onLogout}>Salir</button>}
      </div>
    </div>
  </header>
);

// ─── PRONOSTICOS GRID (todos los participantes) ─────────────────────────────
const PronosticosGrid = ({ partidos, allPronosticos }) => (
  <div className="pronosticos-grid-wrap">
    <h3 className="pronosticos-title">📊 PRONÓSTICOS COMPLETOS — JORNADA {JORNADA_ACTUAL}</h3>
    <p className="pronosticos-sub">{TEMPORADA} · {allPronosticos.length} participante(s)</p>
    <div className="pronosticos-table">
      <div className="pronosticos-header">
        <div className="pronosticos-cell pronosticos-user-header">Participante</div>
        {partidos.map((p) => (
          <div key={p.id} className="pronosticos-cell pronosticos-match-header">
            <span className="ph-local">{p.local.nombre.split(" ")[0]}</span>
            <span className="ph-vs">vs</span>
            <span className="ph-visit">{p.visitante.nombre.split(" ")[0]}</span>
          </div>
        ))}
        <div className="pronosticos-cell pronosticos-goles-header"><span className="ph-local">Total</span><span className="ph-vs">⚽</span><span className="ph-visit">Goles</span></div>
      </div>
      {allPronosticos.map((pro) => (
        <div key={pro.user_id} className="pronosticos-row">
          <div className="pronosticos-cell pronosticos-user-cell">
            <span className="pu-avatar">👤</span>
            <span className="pu-name">{pro.nombre_usuario}</span>
          </div>
          {partidos.map((p) => {
            const pick = pro.picks?.[String(p.id)] || "-";
            return <div key={p.id} className={`pronosticos-cell pronosticos-pick-cell ${getResultColor(pick)}`}>{pick}</div>;
          })}
          <div className="pronosticos-cell pronosticos-goles-cell">{pro.total_goles}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── CONFIRM SCREEN ──────────────────────────────────────────────────────────
const ConfirmScreen = ({ partidos, picks, jornada, totalGoles, allPronosticos }) => {
  const [cd, setCd] = useState(5);
  const [show, setShow] = useState(false);
  useEffect(() => { if (cd <= 0) { setShow(true); return; } const t = setTimeout(() => setCd(s => s-1), 1000); return () => clearTimeout(t); }, [cd]);

  return (
    <div className="confirm-screen-full">
      <div className="confirm-card">
        <div className="confirm-icon">🏆</div>
        <h2 className="confirm-title">¡Quiniela Enviada!</h2>
        <p className="confirm-sub">Jornada {jornada} · {TEMPORADA}</p>
        <div className="confirm-picks">
          {partidos.map((p) => {
            const pick = picks[p.id] || "";
            return (<div key={p.id} className="confirm-row"><span className="confirm-teams">{p.local.nombre} vs {p.visitante.nombre}</span><span className={`confirm-result ${getResultColor(pick)}`}>{pick}</span></div>);
          })}
          <div className="confirm-row confirm-goles-row"><span className="confirm-teams">⚽ Total de goles</span><span className="confirm-result" style={{color:"var(--gold)"}}>{totalGoles}</span></div>
        </div>
        <p className="confirm-mensaje">✅ ¡Quiniela guardada en la base de datos!</p>
        {!show ? (
          <div className="confirm-countdown"><div className="confirm-cd-number">{cd}</div><p className="confirm-cd-text">Ir a los pronósticos completos...</p></div>
        ) : (
          <div className="confirm-goto" onClick={() => document.getElementById("pronosticos-section")?.scrollIntoView({ behavior: "smooth" })}>👇 Ver pronósticos completos</div>
        )}
      </div>
      {show && (
        <div id="pronosticos-section" className="pronosticos-section-anim">
          <PronosticosGrid partidos={partidos} allPronosticos={allPronosticos} />
        </div>
      )}
    </div>
  );
};

// ─── LOGIN / REGISTER SCREEN ─────────────────────────────────────────────────
const AuthScreen = ({ onAuth }) => {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const doShake = (msg) => { setError(msg); setShake(true); setTimeout(() => setShake(false), 500); };

  const handleLogin = async () => {
    if (!email || !password) return doShake("Completa todos los campos");
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return doShake(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos" : error.message);
    onAuth();
  };

  const handleRegister = async () => {
    if (!email || !password || !nombreCompleto || !nombreUsuario) return doShake("Completa todos los campos");
    if (password.length < 6) return doShake("La contraseña debe tener al menos 6 caracteres");
    setLoading(true); setError("");

    // 1. Registrar usuario en auth
    const { data, error: authErr } = await supabase.auth.signUp({ email, password });
    if (authErr) { setLoading(false); return doShake(authErr.message); }

    // 2. Crear perfil
    if (data.user) {
      const { error: perfErr } = await supabase.from("perfiles").insert({
        id: data.user.id,
        nombre_completo: nombreCompleto,
        nombre_usuario: nombreUsuario,
      });
      if (perfErr) { setLoading(false); return doShake(perfErr.message.includes("duplicate") ? "Ese nombre de usuario ya existe" : perfErr.message); }
    }
    setLoading(false);
    onAuth();
  };

  const handleSubmit = (e) => { e.preventDefault(); mode === "login" ? handleLogin() : handleRegister(); };

  return (
    <div className="login-screen">
      <div className="login-particles">{[...Array(6)].map((_, i) => (<div key={i} className="login-particle" style={{ left:`${15+i*14}%`, animationDelay:`${i*0.7}s`, animationDuration:`${3+i*0.5}s` }}/>))}</div>
      <div className={`login-card ${shake ? "login-shake" : ""}`}>
        <div className="login-logo"><div className="login-logo-icon">⚽</div></div>
        <h1 className="login-title">QUINIELA MX</h1>
        <p className="login-subtitle">Liga BBVA MX · {TEMPORADA}</p>
        <div className="login-divider"><span className="login-divider-line"/><span className="login-divider-text">{mode === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}</span><span className="login-divider-line"/></div>

        <div className="login-form">
          {mode === "register" && (
            <>
              <div className="login-field"><label className="login-label">Nombre completo</label><div className="login-input-wrap"><span className="login-input-icon">📝</span><input type="text" className="login-input" placeholder="Ej: Juan Pérez López" value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} /></div></div>
              <div className="login-field"><label className="login-label">Nombre de usuario</label><div className="login-input-wrap"><span className="login-input-icon">🏷️</span><input type="text" className="login-input" placeholder="Ej: juanperez26" value={nombreUsuario} onChange={e=>setNombreUsuario(e.target.value)} /></div></div>
            </>
          )}
          <div className="login-field"><label className="login-label">Email</label><div className="login-input-wrap"><span className="login-input-icon">📧</span><input type="email" className="login-input" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSubmit(e)} autoFocus /></div></div>
          <div className="login-field"><label className="login-label">Contraseña</label><div className="login-input-wrap"><span className="login-input-icon">🔒</span><input type="password" className="login-input" placeholder="Mínimo 6 caracteres" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSubmit(e)} /></div></div>

          {error && <p className="login-error">{error}</p>}

          <button className="login-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "CARGANDO..." : mode === "login" ? "INGRESAR" : "CREAR CUENTA"}
          </button>

          <p className="login-toggle" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function QuinielaMX() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partidos] = useState(PARTIDOS_J11);
  const [picks, setPicks] = useState({});
  const [totalGoles, setTotalGoles] = useState("");
  const [enviada, setEnviada] = useState(false);
  const [yaEnvio, setYaEnvio] = useState(false);
  const [jornada] = useState(JORNADA_ACTUAL);
  const [countdown, setCountdown] = useState("--:--:--");
  const [allPronosticos, setAllPronosticos] = useState([]);
  const [sendError, setSendError] = useState("");

  const cierreMs = new Date("2026-03-13T18:00:00").getTime();

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadPerfil(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setSession(session);
      if (session) loadPerfil(session.user.id);
      else { setPerfil(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadPerfil = async (userId) => {
    const { data } = await supabase.from("perfiles").select("*").eq("id", userId).single();
    setPerfil(data);
    // Check if already submitted for this jornada
    const { data: existing } = await supabase.from("pronosticos").select("*").eq("user_id", userId).eq("jornada", JORNADA_ACTUAL).eq("temporada", TEMPORADA).single();
    if (existing) {
      setPicks(existing.picks);
      setTotalGoles(String(existing.total_goles));
      setEnviada(true);
      setYaEnvio(true);
    }
    await loadAllPronosticos();
    setLoading(false);
  };

  const loadAllPronosticos = async () => {
    const { data } = await supabase.from("pronosticos").select("user_id, picks, total_goles, perfiles(nombre_usuario)").eq("jornada", JORNADA_ACTUAL).eq("temporada", TEMPORADA);
    if (data) {
      setAllPronosticos(data.map(d => ({
        user_id: d.user_id,
        picks: d.picks,
        total_goles: d.total_goles,
        nombre_usuario: d.perfiles?.nombre_usuario || "?",
      })));
    }
  };

  // ── Countdown ──
  useEffect(() => {
    const id = setInterval(() => setCountdown(formatCountdown(cierreMs - Date.now())), 1000);
    return () => clearInterval(id);
  }, [cierreMs]);

  const handlePick = useCallback((id, r) => {
    setPicks(prev => ({ ...prev, [id]: prev[id] === r ? "" : r }));
  }, []);

  const totalFilled = useMemo(() => Object.values(picks).filter(Boolean).length, [picks]);
  const totalPartidos = partidos.length;
  const isComplete = totalFilled === totalPartidos && totalPartidos > 0 && totalGoles.trim() !== "";
  const faltantes = totalPartidos - totalFilled + (totalGoles.trim() === "" ? 1 : 0);

  const handleEnviar = async () => {
    if (!isComplete || !session) return;
    setSendError("");
    const { error } = await supabase.from("pronosticos").insert({
      user_id: session.user.id,
      jornada: JORNADA_ACTUAL,
      temporada: TEMPORADA,
      picks,
      total_goles: parseInt(totalGoles),
    });
    if (error) {
      setSendError(error.message.includes("duplicate") ? "Ya enviaste tu quiniela para esta jornada" : error.message);
      return;
    }
    setEnviada(true);
    setYaEnvio(true);
    await loadAllPronosticos();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setPerfil(null); setEnviada(false); setPicks({}); setTotalGoles(""); setYaEnvio(false);
  };

  // ── Loading ──
  if (loading) return (<><style>{CSS}</style><div className="loading-screen"><div className="spinner"/><p>Cargando...</p></div></>);

  // ── Auth ──
  if (!session) return (<><style>{CSS}</style><AuthScreen onAuth={() => {}} /></>);

  // ── Confirm / Grid ──
  if (enviada) return (
    <><style>{CSS}</style><div id="app-shell"><Header jornada={jornada} user={perfil} onLogout={handleLogout}/>
      <main><ConfirmScreen partidos={partidos} picks={picks} jornada={jornada} totalGoles={totalGoles} allPronosticos={allPronosticos}/></main>
    </div></>
  );

  // ── Quiniela ──
  const progress = totalPartidos === 0 ? 0 : totalFilled / totalPartidos;
  return (
    <><style>{CSS}</style><div id="app-shell"><Header jornada={jornada} user={perfil} onLogout={handleLogout}/>
      <main><div className="page-layout">
        <section className="partidos-section">
          <div className="section-header"><span className="section-title">Pronósticos</span><span className="jornada-tag">JORNADA {jornada} · {TEMPORADA}</span></div>
          {perfil && <p className="welcome-user">Bienvenido, <strong>{perfil.nombre_completo}</strong> (@{perfil.nombre_usuario})</p>}
          <div className="goles-field"><label className="goles-label">⚽ Total de goles de la jornada</label><div className="goles-input-row"><input type="number" min="0" className="goles-input" placeholder="Ej: 24" value={totalGoles} onChange={e=>setTotalGoles(e.target.value)}/>{totalGoles.trim()!=="" && <span className="goles-check">✓</span>}</div></div>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width:`${progress*100}%` }}/></div>
          <div className="countdown-row"><span className="countdown-label">⏱ Cierra en:</span><span className="countdown-time">{countdown}</span></div>
          {partidos.map((p,i) => <PartidoCard key={p.id} partido={p} pick={picks[p.id]||""} onPick={handlePick} index={i}/>)}
        </section>
        <aside className="summary-panel"><div className="panel-card">
          <div className="panel-title">Tu Quiniela</div>
          <ProgressRing filled={totalFilled} total={totalPartidos}/>
          <div className="picks-summary">
            {totalFilled===0 ? <p className="summary-empty">Selecciona tus pronósticos →</p> :
              partidos.filter(p=>picks[p.id]).map(p=>(
                <div key={p.id} className="summary-row"><div><div className="summary-teams">{p.local.nombre} vs {p.visitante.nombre}</div><div className="summary-fecha">{p.fecha} · {p.hora}</div></div><span className={`summary-result ${getResultColor(picks[p.id])}`}>{picks[p.id]}</span></div>
              ))
            }
          </div>
          {sendError && <p className="send-error">{sendError}</p>}
          <button className="submit-btn" disabled={!isComplete} onClick={handleEnviar}>
            {isComplete ? "ENVIAR QUINIELA" : `FALTAN ${faltantes} CAMPO(S)`}
          </button>
          <div className="rules-box"><div className="rules-title">Sistema 1-X-2</div>
            <div className="rule-row"><span className="rtag rtag-1">1</span> Gana el equipo local</div>
            <div className="rule-row"><span className="rtag rtag-x">X</span> Termina en empate</div>
            <div className="rule-row"><span className="rtag rtag-2">2</span> Gana el visitante</div>
          </div>
        </div></aside>
      </div></main>
    </div></>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap');
:root{--bg:#060b14;--card:#0d1520;--card2:#111d2e;--gold:#f0b429;--gold2:#ffd166;--green:#00c98d;--red:#ff4757;--blue:#4a9eff;--text:#eef2ff;--muted:#5a6a8a;--border:rgba(255,255,255,0.07);--border-gold:rgba(240,180,41,0.35);--radius:14px;--radius-sm:10px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body,#root{background:var(--bg);color:var(--text);font-family:'Rajdhani',sans-serif;min-height:100vh;background-image:radial-gradient(ellipse 80% 40% at 50% -10%,rgba(240,180,41,0.08),transparent),radial-gradient(ellipse 50% 60% at 100% 80%,rgba(74,158,255,0.05),transparent)}
.site-header{background:rgba(6,11,20,0.97);border-bottom:1px solid var(--border-gold);position:sticky;top:0;z-index:100;backdrop-filter:blur(16px)}
.header-inner{max-width:1100px;margin:0 auto;padding:0 32px;height:68px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:12px}
.brand-icon{width:42px;height:42px;background:linear-gradient(135deg,#f0b429,#ff6b35);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;box-shadow:0 0 20px rgba(240,180,41,0.4)}
.brand-name{font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:3px;color:var(--gold)}
.brand-sub{font-size:0.7rem;letter-spacing:4px;color:var(--muted);text-transform:uppercase}
.header-right{display:flex;align-items:center;gap:14px}
.torneo-pill{background:rgba(240,180,41,0.12);border:1px solid var(--border-gold);color:var(--gold2);font-family:'Oswald',sans-serif;font-size:0.8rem;letter-spacing:2px;padding:6px 16px;border-radius:20px}
.logout-btn{background:transparent;border:1px solid var(--border);color:var(--muted);font-family:'Oswald',sans-serif;font-size:0.75rem;letter-spacing:1px;padding:6px 14px;border-radius:20px;cursor:pointer;transition:all 0.2s}
.logout-btn:hover{border-color:var(--red);color:var(--red)}
.page-layout{max-width:1100px;margin:0 auto;padding:28px 32px 60px;display:grid;grid-template-columns:1fr 260px;gap:24px;align-items:start}
.section-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.section-title{font-family:'Oswald',sans-serif;font-size:1.2rem;letter-spacing:3px;color:var(--gold);text-transform:uppercase}
.jornada-tag{background:var(--card2);border:1px solid var(--border);color:var(--muted);font-size:0.72rem;padding:4px 12px;border-radius:20px;letter-spacing:2px}
.welcome-user{font-size:0.85rem;color:var(--muted);margin-bottom:14px;letter-spacing:0.5px}
.welcome-user strong{color:var(--text)}
.progress-bar-wrap{height:3px;background:rgba(255,255,255,0.06);border-radius:2px;margin-bottom:14px;overflow:hidden}
.progress-bar-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--green));border-radius:2px;transition:width 0.4s ease}
.countdown-row{display:flex;align-items:center;gap:8px;margin-bottom:20px}
.countdown-label{font-size:0.8rem;color:var(--muted);letter-spacing:1px}
.countdown-time{font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:var(--gold);letter-spacing:3px}
.partido-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;margin-bottom:12px;transition:border-color 0.2s,transform 0.15s;position:relative;overflow:hidden;animation:fadeSlideIn 0.4s ease both}
@keyframes fadeSlideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.partido-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:transparent;border-radius:3px 0 0 3px;transition:background 0.2s}
.partido-card.filled{border-color:rgba(240,180,41,0.25)}.partido-card.filled::before{background:var(--gold)}.partido-card:hover{border-color:rgba(240,180,41,0.3);transform:translateY(-1px)}
.partido-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.liga-badge{font-size:0.65rem;letter-spacing:2px;color:var(--muted);text-transform:uppercase;background:rgba(255,255,255,0.04);padding:3px 10px;border-radius:10px}
.partido-info{display:flex;gap:12px;font-size:0.72rem;color:var(--muted)}
.match-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-bottom:16px}
.team{display:flex;align-items:center;gap:10px}.team.visitante{flex-direction:row-reverse;text-align:right}
.team-escudo{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:rgba(255,255,255,0.05);border:1px solid var(--border);flex-shrink:0}
.team-name{font-family:'Oswald',sans-serif;font-size:1.05rem;font-weight:600;letter-spacing:1px}.team-record{font-size:0.65rem;color:var(--muted);margin-top:2px}
.vs-block{text-align:center}.vs-text{font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--muted);letter-spacing:2px;display:block}.match-time{font-family:'Oswald',sans-serif;font-size:0.9rem;color:var(--gold);font-weight:600}
.picks-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.pick-btn{background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 8px;cursor:pointer;text-align:center;transition:all 0.18s;position:relative;color:var(--text);font-family:inherit}
.pick-btn:hover{background:rgba(255,255,255,0.09);border-color:rgba(255,255,255,0.2)}
.pick-label{font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:2px;display:block;line-height:1}
.pick-desc{font-size:0.62rem;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-top:3px;display:block}
.pick-check{position:absolute;top:6px;right:8px;font-size:0.65rem}
.sel-1{background:rgba(0,201,141,0.15)!important;border-color:rgba(0,201,141,0.6)!important;color:var(--green)!important}.sel-1 .pick-desc{color:var(--green)}
.sel-x{background:rgba(240,180,41,0.15)!important;border-color:rgba(240,180,41,0.6)!important;color:var(--gold)!important}.sel-x .pick-desc{color:var(--gold)}
.sel-2{background:rgba(255,71,87,0.15)!important;border-color:rgba(255,71,87,0.6)!important;color:var(--red)!important}.sel-2 .pick-desc{color:var(--red)}
.summary-panel{position:sticky;top:88px}
.panel-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px}
.panel-title{font-family:'Oswald',sans-serif;font-size:1rem;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)}
.picks-summary{margin-bottom:16px;min-height:60px}
.summary-empty{text-align:center;color:var(--muted);font-size:0.8rem;padding:10px 0}
.summary-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.8rem}.summary-row:last-child{border-bottom:none}
.summary-teams{font-weight:600;font-size:0.76rem}.summary-fecha{font-size:0.66rem;color:var(--muted);margin-top:2px}
.summary-result{font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:1px}
.result-1{color:var(--green)}.result-x{color:var(--gold)}.result-2{color:var(--red)}
.send-error{color:var(--red);font-size:0.78rem;text-align:center;margin-bottom:10px;letter-spacing:0.5px}
.submit-btn{width:100%;background:linear-gradient(135deg,#f0b429,#ff6b35);border:none;border-radius:var(--radius-sm);color:#000;font-family:'Oswald',sans-serif;font-size:0.95rem;font-weight:700;letter-spacing:2px;padding:14px;cursor:pointer;text-transform:uppercase;transition:opacity 0.2s,transform 0.15s;box-shadow:0 4px 20px rgba(240,180,41,0.3)}
.submit-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 28px rgba(240,180,41,0.45)}.submit-btn:disabled{opacity:0.35;cursor:not-allowed}
.rules-box{background:var(--card2);border-radius:var(--radius-sm);padding:14px;margin-top:14px}
.rules-title{font-size:0.7rem;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px}
.rule-row{display:flex;align-items:center;gap:10px;margin-bottom:7px;font-size:0.78rem;color:var(--muted)}
.rtag{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:0.9rem;flex-shrink:0}
.rtag-1{background:rgba(0,201,141,0.2);color:var(--green)}.rtag-x{background:rgba(240,180,41,0.2);color:var(--gold)}.rtag-2{background:rgba(255,71,87,0.2);color:var(--red)}
.confirm-screen-full{display:flex;flex-direction:column;align-items:center;padding:40px 20px 60px;min-height:80vh}
.confirm-card{background:var(--card);border:1px solid var(--border-gold);border-radius:var(--radius);padding:40px;max-width:540px;width:100%;text-align:center;animation:fadeSlideIn 0.5s ease both}
.confirm-icon{font-size:3rem;margin-bottom:12px}.confirm-title{font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:3px;color:var(--gold);margin-bottom:4px}
.confirm-sub{color:var(--muted);font-size:0.85rem;letter-spacing:2px;margin-bottom:24px}
.confirm-picks{text-align:left;border-top:1px solid var(--border);margin-bottom:20px}
.confirm-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem}
.confirm-teams{color:var(--muted)}.confirm-result{font-family:'Bebas Neue',sans-serif;font-size:1.1rem}
.confirm-mensaje{color:var(--green);font-weight:600;letter-spacing:1px}
.confirm-goles-row{border-top:1px dashed rgba(240,180,41,0.3);margin-top:4px;padding-top:10px}
.confirm-countdown{margin-top:24px;text-align:center}
.confirm-cd-number{font-family:'Bebas Neue',sans-serif;font-size:3.5rem;color:var(--gold);line-height:1;animation:pulseNum 1s ease-in-out infinite}
@keyframes pulseNum{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:0.8}}
.confirm-cd-text{font-size:0.85rem;color:var(--muted);letter-spacing:1px;margin-top:6px}
.confirm-goto{margin-top:24px;text-align:center;color:var(--gold);font-family:'Oswald',sans-serif;font-size:0.95rem;letter-spacing:2px;cursor:pointer;padding:12px 24px;border:1px solid var(--border-gold);border-radius:var(--radius-sm);background:rgba(240,180,41,0.08);transition:all 0.2s}
.confirm-goto:hover{background:rgba(240,180,41,0.15);transform:translateY(-1px)}
.loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;color:var(--muted)}
.spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.login-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);background-image:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(240,180,41,0.1),transparent),radial-gradient(ellipse 60% 60% at 0% 100%,rgba(74,158,255,0.06),transparent);position:relative;overflow:hidden}
.login-particle{position:absolute;width:4px;height:4px;background:var(--gold);border-radius:50%;opacity:0.15;animation:floatUp 4s ease-in-out infinite}
@keyframes floatUp{0%{transform:translateY(100vh) scale(1);opacity:0}20%{opacity:0.2}80%{opacity:0.15}100%{transform:translateY(-20vh) scale(0.5);opacity:0}}
.login-card{background:var(--card);border:1px solid var(--border-gold);border-radius:20px;padding:48px 40px;width:100%;max-width:420px;position:relative;z-index:2;animation:fadeSlideIn 0.6s ease both;box-shadow:0 0 60px rgba(240,180,41,0.08),0 20px 60px rgba(0,0,0,0.4)}
.login-shake{animation:shakeX 0.5s ease}
@keyframes shakeX{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
.login-logo{display:flex;justify-content:center;margin-bottom:16px}
.login-logo-icon{width:64px;height:64px;background:linear-gradient(135deg,#f0b429,#ff6b35);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:2rem;box-shadow:0 0 30px rgba(240,180,41,0.4);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 30px rgba(240,180,41,0.4)}50%{box-shadow:0 0 50px rgba(240,180,41,0.6)}}
.login-title{font-family:'Bebas Neue',sans-serif;font-size:2.4rem;letter-spacing:5px;color:var(--gold);text-align:center;margin-bottom:4px}
.login-subtitle{font-size:0.72rem;letter-spacing:4px;color:var(--muted);text-transform:uppercase;text-align:center;margin-bottom:28px}
.login-divider{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.login-divider-line{flex:1;height:1px;background:var(--border)}
.login-divider-text{font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:3px;color:var(--muted)}
.login-field{margin-bottom:18px}
.login-label{display:block;font-family:'Oswald',sans-serif;font-size:0.75rem;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:6px}
.login-input-wrap{display:flex;align-items:center;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:var(--radius-sm);transition:border-color 0.2s,box-shadow 0.2s;overflow:hidden}
.login-input-wrap:focus-within{border-color:rgba(240,180,41,0.5);box-shadow:0 0 0 3px rgba(240,180,41,0.08)}
.login-input-icon{padding:0 12px;font-size:0.9rem;flex-shrink:0}
.login-input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-family:'Rajdhani',sans-serif;font-size:0.95rem;font-weight:500;padding:12px 14px 12px 0;letter-spacing:0.5px}
.login-input::placeholder{color:rgba(90,106,138,0.6)}
.login-btn{width:100%;background:linear-gradient(135deg,#f0b429,#ff6b35);border:none;border-radius:var(--radius-sm);color:#000;font-family:'Oswald',sans-serif;font-size:1rem;font-weight:700;letter-spacing:3px;padding:15px;cursor:pointer;text-transform:uppercase;transition:transform 0.15s,box-shadow 0.2s;box-shadow:0 4px 24px rgba(240,180,41,0.3);margin-top:6px}
.login-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 32px rgba(240,180,41,0.45)}.login-btn:active{transform:translateY(0)}.login-btn:disabled{opacity:0.5;cursor:not-allowed}
.login-error{color:var(--red);font-size:0.8rem;text-align:center;margin-bottom:10px;padding:8px;background:rgba(255,71,87,0.1);border-radius:var(--radius-sm);border:1px solid rgba(255,71,87,0.2)}
.login-toggle{text-align:center;color:var(--gold);font-size:0.82rem;margin-top:20px;cursor:pointer;letter-spacing:0.5px;transition:color 0.2s}.login-toggle:hover{color:var(--gold2)}
.goles-field{background:var(--card);border:1px solid var(--border-gold);border-radius:var(--radius-sm);padding:14px 18px;margin-bottom:16px}
.goles-label{display:block;font-family:'Oswald',sans-serif;font-size:0.82rem;letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px}
.goles-input-row{display:flex;align-items:center;gap:10px}
.goles-input{flex:1;max-width:120px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:3px;padding:10px 14px;text-align:center;outline:none;transition:border-color 0.2s;-moz-appearance:textfield}
.goles-input::-webkit-outer-spin-button,.goles-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.goles-input:focus{border-color:rgba(240,180,41,0.5)}.goles-check{color:var(--green);font-size:1.1rem}
.pronosticos-section-anim{width:100%;max-width:1100px;margin-top:40px;animation:fadeSlideIn 0.6s ease both}
.pronosticos-grid-wrap{background:var(--card);border:1px solid var(--border-gold);border-radius:var(--radius);padding:24px;overflow-x:auto}
.pronosticos-title{font-family:'Oswald',sans-serif;font-size:1.1rem;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:4px}
.pronosticos-sub{font-size:0.72rem;color:var(--muted);letter-spacing:2px;margin-bottom:20px}
.pronosticos-table{display:grid;grid-template-rows:auto;gap:0;min-width:700px}
.pronosticos-header{display:grid;grid-template-columns:160px repeat(9,1fr) 80px;gap:2px}
.pronosticos-row{display:grid;grid-template-columns:160px repeat(9,1fr) 80px;gap:2px;margin-top:2px}
.pronosticos-cell{padding:10px 6px;text-align:center;font-size:0.75rem;border-radius:4px}
.pronosticos-user-header{background:rgba(240,180,41,0.15);color:var(--gold);font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:2px;text-transform:uppercase;display:flex;align-items:center;justify-content:center}
.pronosticos-match-header{background:var(--card2);border:1px solid var(--border);display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 4px}
.ph-local,.ph-visit{font-family:'Oswald',sans-serif;font-size:0.68rem;font-weight:600;letter-spacing:0.5px;color:var(--text)}
.ph-vs{font-size:0.55rem;color:var(--muted);letter-spacing:1px}
.pronosticos-user-cell{background:var(--card2);border:1px solid var(--border);display:flex;align-items:center;gap:8px;padding:10px 12px;text-align:left}
.pu-avatar{font-size:1.1rem}.pu-name{font-family:'Oswald',sans-serif;font-size:0.82rem;font-weight:600;color:var(--text);letter-spacing:0.5px}
.pronosticos-pick-cell{background:rgba(255,255,255,0.03);border:1px solid var(--border);font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:2px;display:flex;align-items:center;justify-content:center}
.pronosticos-pick-cell.result-1{background:rgba(0,201,141,0.12);color:var(--green);border-color:rgba(0,201,141,0.3)}
.pronosticos-pick-cell.result-x{background:rgba(240,180,41,0.12);color:var(--gold);border-color:rgba(240,180,41,0.3)}
.pronosticos-pick-cell.result-2{background:rgba(255,71,87,0.12);color:var(--red);border-color:rgba(255,71,87,0.3)}
.pronosticos-goles-header{background:rgba(240,180,41,0.12);border:1px solid rgba(240,180,41,0.3);display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 4px}
.pronosticos-goles-cell{background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.25);font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:var(--gold);letter-spacing:2px;display:flex;align-items:center;justify-content:center}
@media(max-width:768px){.page-layout{grid-template-columns:1fr;padding:16px}.summary-panel{position:static}.header-inner{padding:0 16px}.partido-info{display:none}.login-card{margin:16px;padding:32px 24px}}
`;
