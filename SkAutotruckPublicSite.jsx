import React, { useState, useEffect, useCallback } from "react";
import { Truck, Search, ChevronLeft, MessageCircle, Phone, MapPin, Clock, Menu, X, Camera } from "lucide-react";

/* ============================================================
   DESIGN TOKENS — same brand as the internal dashboard (Step 33/35):
   White / Black / Deep Burgundy. No dark mode, no neon, no gradients.
   The public site leans more "showroom" (bigger type, bolder hero)
   than the operational admin dashboard, but the palette is identical
   on purpose — same brand, two different audiences.
   ============================================================ */
const T = {
  bg: "#F6F6F7",
  surface: "#FFFFFF",
  ink: "#17181C",
  inkSoft: "#6B6E76",
  inkFaint: "#9A9DA6",
  accent: "#7A1626",
  accentSoft: "#F5E6E8",
  accentHover: "#611220",
  border: "#E3E4E7",
  success: "#1F7A4D",
  successBg: "#E7F3EC",
  warning: "#B5730E",
  warningBg: "#FBF0DD",
  neutral: "#4B4E57",
  neutralBg: "#ECEDEF",
  danger: "#B5301F",
  dangerBg: "#F9E6E3",
};
const font = { fontFamily: 'ui-sans-serif, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' };

/* ============================================================
   PURE LOGIC (kept consistent with the admin dashboard's conventions)
   ============================================================ */
function buildApiUrl(base, path) {
  const cleanBase = (base || "").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : "/" + path;
  return cleanBase + cleanPath;
}
const STATUS_BADGES = {
  "พร้อมขาย": { label: "พร้อมขาย", bg: "#E7F3EC", fg: "#1F7A4D" },
  "จองแล้ว": { label: "จองแล้ว", bg: "#FBF0DD", fg: "#B5730E" },
  "ขายแล้ว": { label: "ขายแล้ว", bg: "#ECEDEF", fg: "#4B4E57" },
};
function formatCurrency(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "-";
  return "฿" + n.toLocaleString("th-TH");
}
function isLiveConnectionError(err) {
  return err instanceof TypeError || (err && err.message === "Failed to fetch");
}
function parseApiError(status, body) {
  if (status === 404) return "ไม่พบข้อมูลที่ต้องการ";
  if (body && body.error && body.error.message) return body.error.message;
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

/* ============================================================
   DEMO DATA — clearly labeled, only used when Demo Mode is explicitly
   toggled on. Never blended silently with live data.
   ============================================================ */
const DEMO_TRUCKS = [
  { truck_id: "TRK-001", brand: "ISUZU", model: "NLR", year: 2016, price: 629000, down_payment: 29000, installment_amount: 15300, installment_count: 60, body_type: "ตู้แห้ง", stock_status: "พร้อมขาย" },
  { truck_id: "TRK-002", brand: "ISUZU", model: "NLR", year: 2016, price: 599000, down_payment: 19000, installment_amount: 14500, installment_count: 60, body_type: "กระบะเหล็ก", stock_status: "พร้อมขาย" },
  { truck_id: "TRK-004", brand: "ISUZU", model: "NLR", year: 2016, price: 609000, down_payment: 25000, installment_amount: 14800, installment_count: 60, body_type: "ตู้แห้ง", stock_status: "จองแล้ว" },
];

/* ============================================================
   API CLIENT — real fetch() to the public backend routes (Step 36).
   No Authorization header at all — this site never logs in.
   ============================================================ */
function usePublicApi(apiBaseUrl) {
  return useCallback(async (path) => {
    try {
      const res = await fetch(buildApiUrl(apiBaseUrl, path));
      let parsed = {};
      try { parsed = await res.json(); } catch (_) { /* non-JSON */ }
      if (!res.ok) return { ok: false, connectionError: false, message: parseApiError(res.status, parsed) };
      return { ok: true, data: parsed };
    } catch (err) {
      return { ok: false, connectionError: isLiveConnectionError(err), message: "ไม่สามารถเชื่อมต่อระบบได้ในขณะนี้" };
    }
  }, [apiBaseUrl]);
}

/* ============================================================
   SHARED UI PIECES
   ============================================================ */
function StatusBadge({ status }) {
  const b = STATUS_BADGES[status] || { label: status, bg: T.neutralBg, fg: T.neutral };
  return <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: b.bg, color: b.fg }}>{b.label}</span>;
}
function LoadingState() {
  return <div className="text-center py-16 text-sm" style={{ color: T.inkFaint }}>กำลังโหลดข้อมูล...</div>;
}
function ErrorState({ message, connectionError, onRetry }) {
  return (
    <div className="text-center py-16 rounded-lg mx-4" style={{ background: T.dangerBg }}>
      <div className="text-sm font-semibold" style={{ color: T.danger }}>{message}</div>
      {connectionError && <div className="text-xs mt-1" style={{ color: T.inkSoft }}>เว็บไซต์นี้ยังไม่สามารถเชื่อมต่อระบบหลังบ้านได้ในขณะนี้</div>}
      {onRetry && <button onClick={onRetry} className="mt-3 text-xs font-semibold px-4 py-1.5 rounded" style={{ background: "#fff", border: `1px solid ${T.danger}`, color: T.danger }}>ลองใหม่อีกครั้ง</button>}
    </div>
  );
}
function EmptyState({ text }) {
  return <div className="text-center py-16 text-sm" style={{ color: T.inkFaint }}>{text}</div>;
}
function DemoBanner() {
  return (
    <div className="text-xs font-semibold text-center py-1.5" style={{ background: T.accentSoft, color: T.accent, borderBottom: `1px solid ${T.accent}` }}>
      DEMO MODE — กำลังแสดงข้อมูลตัวอย่าง ไม่ใช่สต็อกรถจริง
    </div>
  );
}

/** Fetches from a real public endpoint (or Demo fallback) and renders Loading/Error/Empty/children uniformly. */
function DataView({ fetchApi, demoMode, demoData, path, transform, render, emptyCheck, emptyText }) {
  const [state, setState] = useState({ status: "loading", data: null, message: null, connectionError: false });

  const load = useCallback(() => {
    if (demoMode) { setState({ status: "ok", data: transform ? transform(demoData) : demoData }); return; }
    setState((s) => ({ ...s, status: "loading" }));
    fetchApi(path).then((res) => {
      if (!res.ok) setState({ status: "error", message: res.message, connectionError: res.connectionError });
      else setState({ status: "ok", data: transform ? transform(res.data) : res.data });
    });
  }, [demoMode, path]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState message={state.message} connectionError={state.connectionError} onRetry={load} />;
  if (emptyCheck && emptyCheck(state.data)) return <EmptyState text={emptyText} />;
  return render(state.data, load);
}

/* ============================================================
   HEADER / FOOTER
   ============================================================ */
function Header({ page, setPage, mobileOpen, setMobileOpen, demoMode, setDemoMode }) {
  const NAV = [
    { id: "home", label: "หน้าแรก" },
    { id: "trucks", label: "รถทั้งหมด" },
    { id: "contact", label: "ติดต่อเรา" },
  ];
  return (
    <header style={{ background: T.ink, borderBottom: `3px solid ${T.accent}` }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage("home")}>
          <Truck size={22} style={{ color: T.accent }} />
          <span className="text-lg font-bold tracking-tight text-white">S.K.AUTOTRUCK</span>
        </div>
        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((n) => (
            <span key={n.id} onClick={() => setPage(n.id)} className="text-sm font-medium cursor-pointer"
              style={{ color: page === n.id ? T.accent : "#E7E7E9" }}>
              {n.label}
            </span>
          ))}
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none" style={{ color: "#9A9DA6" }}>
            <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
            Demo
          </label>
        </nav>
        <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-3" style={{ background: T.ink }}>
          {NAV.map((n) => (
            <span key={n.id} onClick={() => { setPage(n.id); setMobileOpen(false); }} className="text-sm font-medium"
              style={{ color: page === n.id ? T.accent : "#E7E7E9" }}>
              {n.label}
            </span>
          ))}
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "#9A9DA6" }}>
            <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
            Demo Mode
          </label>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16" style={{ background: T.ink, color: "#9A9DA6" }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="text-white font-bold text-base mb-2">S.K.AUTOTRUCK</div>
          <div>รถบรรทุกมือสองคุณภาพ ตรวจสอบได้ทุกคัน</div>
        </div>
        <div>
          <div className="text-white font-semibold mb-2">ติดต่อ</div>
          <div>ข้อมูลติดต่อ — กรุณากรอกข้อมูลจริงก่อนเผยแพร่เว็บไซต์</div>
        </div>
        <div>
          <div className="text-white font-semibold mb-2">เวลาทำการ</div>
          <div>ข้อมูลเวลาทำการ — กรุณากรอกข้อมูลจริงก่อนเผยแพร่เว็บไซต์</div>
        </div>
      </div>
      <div className="text-center text-xs py-4" style={{ borderTop: "1px solid #2A2C31" }}>
        © {new Date().getFullYear()} S.K.AUTOTRUCK
      </div>
    </footer>
  );
}

/* ============================================================
   TRUCK CARD
   ============================================================ */
function TruckCard({ t, onClick }) {
  return (
    <div onClick={onClick} className="rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="h-40 flex items-center justify-center" style={{ background: T.neutralBg }}>
        <Camera size={26} style={{ color: T.inkFaint }} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-base" style={{ color: T.ink }}>{t.brand} {t.model}</div>
            <div className="text-xs" style={{ color: T.inkSoft }}>ปี {t.year} · {t.body_type || "-"}</div>
          </div>
          <StatusBadge status={t.stock_status} />
        </div>
        <div className="text-xl font-bold mt-3" style={{ color: T.accent }}>{formatCurrency(t.price)}</div>
        <div className="text-xs mt-0.5" style={{ color: T.inkSoft }}>ดาวน์ {formatCurrency(t.down_payment)} · ผ่อน {formatCurrency(t.installment_amount)} × {t.installment_count} งวด</div>
      </div>
    </div>
  );
}

/* ============================================================
   HOME PAGE
   ============================================================ */
function HomePage({ fetchApi, demoMode, setPage, onOpenTruck }) {
  return (
    <div>
      <div className="text-center py-16 md:py-24 px-4" style={{ background: `linear-gradient(180deg, ${T.ink} 0%, #262830 100%)` }}>
        <div className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">รถบรรทุกมือสองคุณภาพ</div>
        <div className="text-3xl md:text-5xl font-extrabold mt-1" style={{ color: T.accent }}>ตรวจสอบได้ทุกคัน</div>
        <div className="text-sm md:text-base mt-4 max-w-xl mx-auto" style={{ color: "#C9CACE" }}>
          ISUZU NLR / NKR และรถบรรทุกเพื่อการพาณิชย์ พร้อมข้อมูลราคา เงินดาวน์ และค่างวดที่ชัดเจน
        </div>
        <button onClick={() => setPage("trucks")} className="mt-7 px-7 py-3 rounded-md text-sm font-bold"
          style={{ background: T.accent, color: "#fff" }}>
          ดูรถทั้งหมด
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <div className="text-xl font-bold mb-5" style={{ color: T.ink }}>รถแนะนำ</div>
        {demoMode && <div className="mb-4"><DemoBanner /></div>}
        <DataView fetchApi={fetchApi} demoMode={demoMode} demoData={{ trucks: DEMO_TRUCKS }} path="/api/public/trucks"
          transform={(d) => d.trucks.slice(0, 3)} emptyCheck={(t) => t.length === 0} emptyText="ยังไม่มีรถแนะนำในขณะนี้"
          render={(trucks) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {trucks.map((t) => <TruckCard key={t.truck_id} t={t} onClick={() => onOpenTruck(t.truck_id)} />)}
            </div>
          )}
        />
      </div>
    </div>
  );
}

/* ============================================================
   TRUCK LISTING PAGE
   ============================================================ */
function TruckListingPage({ fetchApi, demoMode, onOpenTruck }) {
  const [search, setSearch] = useState("");
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
      <div className="text-2xl font-bold mb-1" style={{ color: T.ink }}>รถทั้งหมด</div>
      <div className="text-sm mb-6" style={{ color: T.inkSoft }}>ราคา เงินดาวน์ และค่างวดที่แสดง เป็นข้อมูลจริงจากสต็อกปัจจุบัน</div>
      {demoMode && <div className="mb-4"><DemoBanner /></div>}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.inkFaint }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหารุ่น เช่น NLR"
          className="w-full pl-9 pr-3 py-2.5 rounded-md text-sm" style={{ border: `1px solid ${T.border}` }} />
      </div>
      <DataView fetchApi={fetchApi} demoMode={demoMode} demoData={{ trucks: DEMO_TRUCKS }} path="/api/public/trucks"
        transform={(d) => d.trucks}
        emptyCheck={(trucks) => trucks.filter((t) => !search || (t.model || "").toLowerCase().includes(search.toLowerCase()) || (t.brand || "").toLowerCase().includes(search.toLowerCase())).length === 0}
        emptyText="ไม่พบรถตามที่ค้นหา"
        render={(trucks) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trucks.filter((t) => !search || (t.model || "").toLowerCase().includes(search.toLowerCase()) || (t.brand || "").toLowerCase().includes(search.toLowerCase()))
              .map((t) => <TruckCard key={t.truck_id} t={t} onClick={() => onOpenTruck(t.truck_id)} />)}
          </div>
        )}
      />
    </div>
  );
}

/* ============================================================
   TRUCK DETAIL PAGE
   ============================================================ */
function TruckDetailPage({ fetchApi, demoMode, truckId, onBack }) {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <div onClick={onBack} className="flex items-center gap-1.5 text-sm mb-4 cursor-pointer" style={{ color: T.accent }}>
        <ChevronLeft size={16} /> กลับไปหน้ารถทั้งหมด
      </div>
      {demoMode && <div className="mb-4"><DemoBanner /></div>}
      <DataView fetchApi={fetchApi} demoMode={demoMode}
        demoData={{ truck: DEMO_TRUCKS.find((t) => t.truck_id === truckId) || DEMO_TRUCKS[0] }}
        path={`/api/public/trucks/${truckId}`} emptyCheck={(d) => !d.truck} emptyText="ไม่พบรถคันนี้"
        render={(d) => {
          const t = d.truck;
          return (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="h-72 rounded-lg flex items-center justify-center mb-3" style={{ background: T.neutralBg }}>
                    <Camera size={32} style={{ color: T.inkFaint }} />
                  </div>
                  <DataView fetchApi={fetchApi} demoMode={demoMode} demoData={{ photos: [] }} path={`/api/public/trucks/${truckId}/photos`}
                    transform={(pd) => pd.photos} emptyCheck={(p) => p.length === 0} emptyText="ยังไม่มีรูปเพิ่มเติมสำหรับรถคันนี้"
                    render={(photos) => (
                      <div className="grid grid-cols-4 gap-2">
                        {photos.map((p) => (
                          <div key={p.photo_id} className="h-16 rounded flex items-center justify-center" style={{ background: T.neutralBg }}>
                            <Camera size={14} style={{ color: T.inkFaint }} />
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: T.ink }}>{t.brand} {t.model} ปี {t.year}</div>
                  <div className="text-xs mt-1" style={{ color: T.inkFaint }}>รหัสรถ {t.truck_id} · {t.body_type || "-"}</div>
                  <div className="mt-3"><StatusBadge status={t.stock_status} /></div>
                  <div className="text-3xl font-bold mt-4" style={{ color: T.accent }}>{formatCurrency(t.price)}</div>
                  <div className="text-sm mt-2" style={{ color: T.inkSoft }}>เงินดาวน์เริ่มต้น {formatCurrency(t.down_payment)} บาท</div>
                  <div className="text-sm" style={{ color: T.inkSoft }}>ผ่อนประมาณ {formatCurrency(t.installment_amount)} บาท × {t.installment_count} งวด</div>
                  <div className="text-[11px] mt-1" style={{ color: T.inkFaint }}>เงื่อนไขจริงขึ้นอยู่กับผลไฟแนนซ์ของแต่ละท่าน</div>

                  {t.stock_status === "ขายแล้ว" ? (
                    <div className="mt-6 px-4 py-3 rounded-md text-sm font-semibold" style={{ background: T.neutralBg, color: T.neutral }}>
                      คันนี้ขายแล้ว — ดูรถคันอื่นที่ยังพร้อมขายได้ในหน้ารถทั้งหมด
                    </div>
                  ) : (
                    <a href="#" onClick={(e) => e.preventDefault()} className="mt-6 flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-bold"
                      style={{ background: T.accent, color: "#fff" }}>
                      <MessageCircle size={16} /> สอบถามคันนี้ผ่าน Facebook Messenger
                    </a>
                  )}
                  <div className="text-[11px] text-center mt-2" style={{ color: T.inkFaint }}>
                    ลิงก์ Messenger จะเชื่อมต่อจริงเมื่อเปิดใช้งาน Facebook Page (ยังไม่เชื่อมในขั้นนี้)
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

/* ============================================================
   CONTACT PAGE
   ============================================================ */
function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <div className="text-2xl font-bold mb-6" style={{ color: T.ink }}>ติดต่อเรา</div>
      <div className="rounded-lg p-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-start gap-3 mb-4">
          <MessageCircle size={18} style={{ color: T.accent }} className="mt-0.5" />
          <div>
            <div className="text-sm font-semibold" style={{ color: T.ink }}>Facebook Messenger</div>
            <div className="text-xs" style={{ color: T.inkFaint }}>จะเชื่อมต่อจริงเมื่อเปิดใช้งาน Facebook Page ของร้าน</div>
          </div>
        </div>
        <div className="flex items-start gap-3 mb-4">
          <Phone size={18} style={{ color: T.accent }} className="mt-0.5" />
          <div>
            <div className="text-sm font-semibold" style={{ color: T.ink }}>เบอร์โทรศัพท์</div>
            <div className="text-xs" style={{ color: T.inkFaint }}>กรุณากรอกเบอร์โทรจริงก่อนเผยแพร่เว็บไซต์</div>
          </div>
        </div>
        <div className="flex items-start gap-3 mb-4">
          <MapPin size={18} style={{ color: T.accent }} className="mt-0.5" />
          <div>
            <div className="text-sm font-semibold" style={{ color: T.ink }}>ที่อยู่ร้าน</div>
            <div className="text-xs" style={{ color: T.inkFaint }}>กรุณากรอกที่อยู่จริงก่อนเผยแพร่เว็บไซต์</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock size={18} style={{ color: T.accent }} className="mt-0.5" />
          <div>
            <div className="text-sm font-semibold" style={{ color: T.ink }}>เวลาทำการ</div>
            <div className="text-xs" style={{ color: T.inkFaint }}>กรุณากรอกเวลาทำการจริงก่อนเผยแพร่เว็บไซต์</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */
export default function SkAutotruckPublicSite() {
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:3001");
  const [demoMode, setDemoMode] = useState(false);
  const [page, setPage] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState(null);

  const fetchApi = usePublicApi(apiBaseUrl);

  function openTruck(id) {
    setSelectedTruckId(id);
    setPage("truckDetail");
    setMobileOpen(false);
  }

  let content;
  if (page === "home") content = <HomePage fetchApi={fetchApi} demoMode={demoMode} setPage={setPage} onOpenTruck={openTruck} />;
  else if (page === "trucks") content = <TruckListingPage fetchApi={fetchApi} demoMode={demoMode} onOpenTruck={openTruck} />;
  else if (page === "truckDetail") content = <TruckDetailPage fetchApi={fetchApi} demoMode={demoMode} truckId={selectedTruckId} onBack={() => setPage("trucks")} />;
  else if (page === "contact") content = <ContactPage />;

  return (
    <div style={{ background: T.bg, color: T.ink, minHeight: "100vh", ...font }}>
      <Header page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} demoMode={demoMode} setDemoMode={setDemoMode} />
      {demoMode && page !== "home" && page !== "trucks" && page !== "truckDetail" && <DemoBanner />}
      {content}
      <Footer />
      <div className="fixed bottom-3 right-3 z-10">
        <details className="text-xs bg-white rounded-md shadow-md" style={{ border: `1px solid ${T.border}` }}>
          <summary className="cursor-pointer px-3 py-2" style={{ color: T.inkSoft }}>API URL</summary>
          <div className="p-3 pt-0">
            <input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} className="w-56 px-2 py-1.5 rounded text-xs"
              style={{ border: `1px solid ${T.border}` }} />
          </div>
        </details>
      </div>
    </div>
  );
}
