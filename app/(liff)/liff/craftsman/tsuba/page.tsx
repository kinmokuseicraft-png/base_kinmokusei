import Image from 'next/image'
import Link from 'next/link'
import './animations.css'
import TsubaAnimations from './TsubaAnimations'

export const metadata = {
  title: '齋藤翼のものがたり — 木軸ペン工房 金杢犀',
}

const episodes = [
  {
    ch: 'Episode 01',
    title: <>子どものころから、<br />物を作ることが好きだった。</>,
    body: `絵を描くこと、生き物を調べること、何かを自分の手で作ること—— どれも夢中だった。家は母子家庭で、弟とよく二人で過ごした。そのころから「自分の手で何かを作る」ことがいちばん自分らしかった。`,
    img: '/liff/craftsman/tsuba/ep1.jpg',
    delay: '',
  },
  {
    ch: 'Episode 02',
    title: <>タンスを壊しながら、<br />思った。</>,
    body: `ふと帰省したとき、母が言った。「もう使わないから、処分しちゃおう」嫁入り道具として共に過ごしてきたタンス。ノコギリを挽いて、ハンマーを叩き、どんどんと小さくなるその姿が、母の背中と重なった。「形を変えて、残せないか」—— 気づけば貯金を崩し、工具を買い、一人手探りでペンを作っていた。`,
    img: '/liff/craftsman/tsuba/ep2.jpg',
    delay: 'd1',
  },
  {
    ch: 'Episode 03',
    title: <>作るたびに、<br />楽しくなっていった。</>,
    body: `失敗して、また試す。少しずつ手が慣れてくる。木が思い通りの形になった瞬間の、あの感覚が忘れられなかった。「もっと良いものが作りたい」—— その一心で工具を揃え、気づけば一日中工房にいた。失敗した時にどうやったらうまくいくか、その試行錯誤の過程そのものを楽しんでいた。`,
    img: '/liff/craftsman/tsuba/ep3.jpg',
    delay: 'd2',
  },
]

const timeline = [
  { year: '幼少期', title: '物作りへの目覚め', desc: '図工の時間が大好きだった。母子家庭の中で、弟と二人で過ごした日々。自分の手で何かを生み出すことが、いちばん自分らしかった。' },
  { year: '学生時代', title: '食物調理科で、素材と刃物を学ぶ', desc: '高校では食物調理科へ。素材の組み合わせ、順序、安全性—— そして包丁の扱い。刃物への敬意と正しい使い方を、徹底的に叩き込まれた。この感覚は、旋盤や工作機械を扱う今にもそのまま生きている。' },
  { year: '会社員', title: 'デザインと言葉を、ここで学んだ', desc: '営業の現場で、写真・文章・広報の力を知る。「その人にほんとうに合うものを届ける」という感覚が、今の物作りの根底に流れている。' },
  { year: '転機', title: 'タンスとの別れ、ペンの始まり', desc: '母の嫁入り道具を解体する場面に立ち会う。「形を変えて残せないか」という問いが生まれる。記念の時計を売り、機材を買い、独学でペン作りを開始。' },
  { year: '創業', title: '木軸ペン工房 金杢犀、誕生', desc: '千葉市の小さな部屋から、家族と共に始動。1月1日の初回販売でスタートダッシュを切る。' },
  { year: '2023', title: 'Creema SPRINGS — 目標の727%達成', desc: '木象嵌の魅力を伝えたいという想いでスタート。200,000円の目標に対し、1,454,460円が集まった。同年、母の思い出の場所・日本橋三越本店で催事。' },
  { year: '2025', title: '株式会社化、新しいフェーズへ', desc: 'ずっと一人でやるつもりだったが、法人化。スタッフを迎えることで、一人では生み出せなかった新しい価値が生まれ始めている。' },
  { year: 'これから', title: '伝統を踏まえて、新しいものを作る。', desc: '木象嵌、漆、沈金—— 先人たちが磨き上げてきた技術を、ただ守るのではなく、自分なりの解釈で新しい形に生かしていきたい。伝統は出発点であり、制約ではない。' },
]

const marqueeItems = ['大切なものは、形を変えて生き続ける', '失敗した時にどうやったらうまくいくか', '小さな行動が、面白い結果を生む', '木象嵌の魅力を、次の世代へ']

export default function TsubaPage() {
  return (
    <main style={{ fontFamily: "'Noto Serif JP', serif", background: '#faf8f4', color: '#2a2018', overflowX: 'hidden' }}>
      <TsubaAnimations />

      {/* ── ナビ ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(250,248,244,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid rgba(61,43,26,0.1)',
      }}>
        <span style={{ fontStyle: 'italic', fontSize: 10, letterSpacing: '0.2em', color: '#7a6a58', fontFamily: 'serif' }}>The Craftsman</span>
        <span style={{ fontSize: 11, letterSpacing: '0.2em' }}>齋藤翼のものがたり</span>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '80vw', maxHeight: 520, overflow: 'hidden', background: '#2a1f14' }}>
        <Image
          src="/liff/craftsman/tsuba/hero-bg.jpg"
          alt="hero"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.55 }}
          priority
        />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', padding: '0 28px 40px',
        }}>
          <span className="hero-eyebrow" style={{ fontSize: 10, letterSpacing: '0.25em', color: '#b8860b', marginBottom: 20, fontStyle: 'italic', fontFamily: 'serif' }}>The Craftsman</span>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '0.7em' }}>
            {/* タイトル3列 */}
            {['ペンと。', '家族と、', '木と、'].map((col, i) => (
              <span key={col} className="hero-title" style={{
                writingMode: 'vertical-rl', textOrientation: 'mixed',
                fontSize: 32, fontWeight: 700, color: '#faf8f4',
                lineHeight: 1.6, letterSpacing: '0.08em', display: 'block',
                animationDelay: `${0.6 + i * 0.12}s`,
              }}>{col}</span>
            ))}
            {/* 区切り線 */}
            <span className="hero-vline" style={{ margin: '0 10px' }} />
            {/* サブ3列 */}
            {['その先にある夢。', '歩んできた道と、', '代表・齋藤翼が'].map((col, i) => (
              <span key={col} className="hero-sub" style={{
                writingMode: 'vertical-rl', textOrientation: 'mixed',
                fontSize: 9, color: 'rgba(250,248,244,0.5)', lineHeight: 1.8,
                letterSpacing: '0.1em', display: 'block',
                animationDelay: `${1.5 + i * 0.1}s`,
              }}>{col}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── カウントアップ ── */}
      <section id="count-section" style={{ background: '#f2ede5', padding: '64px 24px 56px', borderBottom: '0.5px solid rgba(61,43,26,0.1)' }}>
        <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 10, letterSpacing: '0.24em', color: '#b8860b', display: 'block', marginBottom: 40, textAlign: 'center' }}>Numbers</span>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: 0 }}>
          {[
            { num: 727, suffix: '%', unit: '達成率', desc: 'Creema SPRINGS\nクラウドファンディング' },
            { num: 3000, suffix: '+', unit: '作品以上', desc: 'これまでに手がけた\n作品数' },
            { num: 100, suffix: '+', unit: '種類以上', desc: '取り扱う\n世界の銘木' },
          ].map((c, i) => (
            <div key={c.unit} style={{ flex: 1, textAlign: 'center', position: 'relative', padding: '0 8px' }}>
              {i > 0 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '0.5px', background: 'rgba(61,43,26,0.12)' }} />}
              <div
                data-target={c.num}
                data-suffix={c.suffix}
                style={{ fontFamily: 'serif', fontStyle: 'italic', fontWeight: 400, fontSize: 44, lineHeight: 1, letterSpacing: '0.02em', color: '#2a2018', marginBottom: 8 }}
              >0</div>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontWeight: 300, fontSize: 9, letterSpacing: '0.18em', color: '#b8860b', marginBottom: 10 }}>{c.unit}</div>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontWeight: 200, fontSize: 10, color: '#7a6a58', lineHeight: 1.9, letterSpacing: '0.06em', whiteSpace: 'pre-line' }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── マーキー ── */}
      <div style={{ background: '#2a1f14', padding: '10px 0', overflow: 'hidden' }}>
        <div className="marquee-track" style={{ display: 'inline-block', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(232,212,154,0.7)' }}>
          {[...marqueeItems, ...marqueeItems].map((t, i) => (
            <span key={i}>&ensp;{t}&ensp;<span style={{ fontFamily: 'serif', fontStyle: 'italic', color: 'rgba(184,134,11,0.45)' }}>—</span></span>
          ))}
        </div>
      </div>

      {/* ── はじまりの話 ── */}
      <section style={{ padding: '64px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 18, letterSpacing: '0.2em' }}>はじまりの話</div>
          <div style={{ fontSize: 10, color: '#7a6a58', letterSpacing: '0.3em', marginTop: 6 }}>Where it all began</div>
        </div>

        <div>
          {episodes.map((ep) => (
            <div key={ep.ch} className={`ep ${ep.delay}`}>
              <div className="ep-photo">
                <Image src={ep.img} alt={ep.ch} width={800} height={480} style={{ objectFit: 'cover', objectPosition: 'center top', width: '100%', height: '100%' }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(42,31,20,0.6) 0%, transparent 50%)',
                }} />
              </div>
              <div className="ep-text">
                <span style={{ fontSize: 10, letterSpacing: '0.3em', color: '#b8860b', fontStyle: 'italic', fontFamily: 'serif' }}>{ep.ch}</span>
                <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.6, margin: '10px 0 16px', letterSpacing: '0.05em' }}>{ep.title}</h2>
                <p style={{ fontSize: 13, lineHeight: 2.1, color: '#3d2b1a', letterSpacing: '0.05em' }}>{ep.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── タイムライン ── */}
      <section style={{ padding: '64px 24px', background: '#f2ede5' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 18, letterSpacing: '0.2em' }}>歩みのかたち</div>
          <div style={{ fontSize: 10, color: '#7a6a58', letterSpacing: '0.3em', marginTop: 6 }}>Timeline</div>
        </div>

        <div style={{ position: 'relative', paddingLeft: 28 }}>
          <div style={{ position: 'absolute', left: 8, top: 8, bottom: 0, width: 1, background: 'rgba(184,134,11,0.3)' }} />

          {timeline.map((tl, i) => (
            <div key={i} className="tl-item" style={{ position: 'relative', marginBottom: 40 }}>
              <div style={{ position: 'absolute', left: -24, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="tl-dot" style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#b8860b', border: '2px solid #f2ede5', flexShrink: 0,
                }} />
                {i < timeline.length - 1 && (
                  <div className="tl-line" style={{ width: 1, height: 60, background: 'rgba(184,134,11,0.3)', marginTop: 4 }} />
                )}
              </div>
              <span className="tl-year" style={{ fontSize: 10, color: '#b8860b', letterSpacing: '0.2em', display: 'block', marginBottom: 4 }}>{tl.year}</span>
              <p className="tl-title" style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>{tl.title}</p>
              <p className="tl-desc" style={{ fontSize: 12, lineHeight: 2, color: '#7a6a58' }}>{tl.desc}</p>
            </div>
          ))}
        </div>

        {/* 万年筆画像 */}
        <div className="tl-future-img" style={{ marginTop: 48, padding: '0 8px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/liff/craftsman/tsuba/future.jpg"
            alt="これからの一本"
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 4 }}
          />
        </div>
      </section>

      {/* ── 締めの一文 ── */}
      <section style={{ padding: '80px 24px', background: '#2a1f14', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'flex-start', gap: '2em', marginBottom: 32 }}>
          {['大切なものは、', '形を変えて', '生き続ける。'].map((col) => (
            <span key={col} style={{
              writingMode: 'vertical-rl', textOrientation: 'mixed',
              fontSize: 18, lineHeight: 2.0, color: '#e8d49a', letterSpacing: '0.18em',
              display: 'block',
            }}>{col}</span>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(232,212,154,0.6)', lineHeight: 2.2, letterSpacing: '0.1em' }}>
          千葉の小さな部屋で始まった物語は、<br />今も続いています。
        </p>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '48px 24px', background: '#faf8f4', textAlign: 'center' }}>
        <span style={{ display: 'block', fontSize: 10, letterSpacing: '0.3em', color: '#b8860b', marginBottom: 20 }}>Next</span>
        <Link
          href="https://kinmokuseijp.base.shop"
          target="_blank"
          style={{
            display: 'block', padding: '16px 0',
            background: '#2a1f14', color: '#e8d49a',
            fontSize: 13, letterSpacing: '0.3em', textDecoration: 'none',
            marginBottom: 12,
          }}
        >
          作　品　を　見　る
        </Link>
        <Link
          href="/liff/craftsman/studio"
          style={{
            display: 'block', padding: '16px 0',
            border: '0.5px solid #b8860b', color: '#b8860b',
            fontSize: 13, letterSpacing: '0.3em', textDecoration: 'none',
          }}
        >
          工　房　の　は　な　し　へ　→
        </Link>
      </section>

      {/* ── フッター ── */}
      <footer style={{ padding: '32px 24px', background: '#2a1f14', textAlign: 'center' }}>
        <div style={{ fontSize: 14, letterSpacing: '0.3em', color: '#e8d49a', marginBottom: 6 }}>KINMOKUSEI</div>
        <div style={{ fontSize: 11, color: 'rgba(232,212,154,0.5)', letterSpacing: '0.15em', marginBottom: 8 }}>木軸ペン工房 金杢犀</div>
        <div style={{ fontSize: 11, color: '#b8860b', letterSpacing: '0.2em' }}>謙虚　陶酔　初恋</div>
      </footer>
    </main>
  )
}
