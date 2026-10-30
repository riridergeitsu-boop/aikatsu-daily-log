import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate,
  spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

// ---- timing --------------------------------------------------------------
// Scene boundaries in narration-source seconds (from silence/ASR alignment).
// The narration TTS also read the caption note (CUT_FROM..CUT_TO) and the stage
// directions after scene 30 (NARR_END); both are cut from the audio.
const CUT_FROM = 74.67;
const CUT_TO = 85.92;
const NARR_END = 158.85;
const SRC = [
  0, 1.82, 6.15, 12.45, 16.95, 19.91, 25.49, 30.89, 37.51, 39.64, 46.6, 47.59, 50.3,
  55.3, 60.98, 67.35, CUT_FROM, /* cut */ 90.0, 94.8, 107.38, 110.98, 117.8, 120.68,
  124.61, 126.59, 130.58, 138.1, 144.66, 152.36, 156.59, NARR_END,
];
const toOut = (t: number) => (t >= CUT_TO ? t - (CUT_TO - CUT_FROM) : t);
const NARR_OUT = toOut(NARR_END);
const ENDING_SEC = 13;
const ENDCARD_SEC = 3;
export const TOTAL_SEC = NARR_OUT + ENDING_SEC + ENDCARD_SEC;

// out-time [start, end) of scene n (1-based); scene 17 starts right after the cut.
const sceneSpan = (n: number): [number, number] => {
  const s = n === 17 ? CUT_FROM : toOut(SRC[n - 1]);
  return [s, toOut(SRC[n])];
};

// ---- look ----------------------------------------------------------------
const PINK = '#e8317c';
const FONT = '"Yurka", "ユールカ", "Mochiy Pop One", sans-serif';
const a = (f: string) => staticFile(`a/${f}`);

const usePop = (delay = 0) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping: 12, stiffness: 180}});
};

const T: React.FC<{
  children: React.ReactNode; y: number; size?: number; color?: string; delay?: number; shake?: boolean;
}> = ({children, y, size = 96, color = PINK, delay = 0, shake}) => {
  const p = usePop(delay);
  const frame = useCurrentFrame();
  const dx = shake ? Math.sin(frame * 1.7) * 6 : 0;
  return (
    <div style={{
      position: 'absolute', top: y, left: 40, right: 40, textAlign: 'center',
      fontFamily: FONT, fontSize: size, lineHeight: 1.25, color,
      WebkitTextStroke: `${Math.round(size / 6)}px white`, paintOrder: 'stroke fill',
      transform: `translateX(${dx}px) scale(${p})`, opacity: Math.min(1, p * 2), whiteSpace: 'pre-line',
    }}>
      {children}
    </div>
  );
};

const Pic: React.FC<{
  src: string; w: number; x?: number; y: number; delay?: number; zoom?: [number, number];
  blend?: boolean; style?: React.CSSProperties;
}> = ({src, w, x = 540, y, delay = 0, zoom, blend, style}) => {
  const p = usePop(delay);
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const z = zoom ? interpolate(frame, [0, durationInFrames], zoom, {extrapolateRight: 'clamp'}) : 1;
  return (
    <Img src={a(src)} style={{
      position: 'absolute', width: w, left: x - w / 2, top: y, transformOrigin: 'center top',
      transform: `scale(${p * z})`, opacity: Math.min(1, p * 2),
      mixBlendMode: blend ? 'multiply' : undefined, ...style,
    }} />
  );
};

// A tall screenshot shown in a rounded window, optionally scrolling.
const Shot: React.FC<{
  src: string; w: number; h: number; y: number; x?: number; from?: number; to?: number; delay?: number; mosaic?: boolean;
}> = ({src, w, h, y, x = 540, from = 0, to = 0, delay = 0, mosaic}) => {
  const p = usePop(delay);
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const off = interpolate(frame, [0, durationInFrames], [from, to], {extrapolateRight: 'clamp'});
  return (
    <div style={{
      position: 'absolute', left: x - w / 2, top: y, width: w, height: h, overflow: 'hidden',
      borderRadius: 28, border: `6px solid ${PINK}`, background: 'white', transform: `scale(${p})`,
      boxShadow: '0 10px 30px rgba(232,49,124,.25)',
    }}>
      <Img src={a(src)} style={{width: '100%', transform: `translateY(${-off}%)`, filter: mosaic ? 'blur(6px)' : undefined}} />
      {mosaic && (
        <div style={{position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,.55)', color: 'white',
          fontFamily: FONT, fontSize: 30, padding: '4px 14px', borderRadius: 12}}>モザイク</div>
      )}
    </div>
  );
};

const Gray: React.FC = () => <AbsoluteFill style={{background: 'rgba(60,50,60,.42)'}} />;

const Label: React.FC<{children: React.ReactNode; x: number; y: number; delay?: number; size?: number}> = ({children, x, y, delay = 0, size = 52}) => {
  const p = usePop(delay);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `translateX(-50%) scale(${p})`,
      background: 'white', border: `5px solid ${PINK}`, borderRadius: 999, padding: '10px 30px',
      fontFamily: FONT, fontSize: size, color: PINK, whiteSpace: 'nowrap',
    }}>{children}</div>
  );
};

const Small: React.FC<{children: React.ReactNode; y: number}> = ({children, y}) => (
  <div style={{position: 'absolute', top: y, left: 60, right: 60, textAlign: 'center', fontFamily: FONT,
    fontSize: 30, color: '#5a3a4a', background: 'rgba(255,255,255,.85)', borderRadius: 16, padding: '10px 18px', lineHeight: 1.5}}>
    {children}
  </div>
);

// ---- scenes ----------------------------------------------------------------
const OFFICIAL = 'https://dcd.aikatsu.com/encore/shoplist/';
type Scene = {n: number; src?: string; gray?: boolean; el: React.ReactNode};

const scenes: Scene[] = [
  {n: 1, src: OFFICIAL, el: <>
    <Pic src="logo.png" w={860} y={560} />
    <T y={1080} size={104}>あそべるお店が{'\n'}わかる！</T>
  </>},
  {n: 2, el: <>
    <T y={250} size={80}>公式サイトが{'\n'}更新されたので見ていく！</T>
    <Shot src="off_post.png" w={640} h={1100} y={520} from={0} to={8} delay={6} />
  </>},
  {n: 3, src: OFFICIAL, el: <>
    <T y={250} size={110}>ついに！</T>
    <T y={400} size={76} delay={10}>あそべるお店が{'\n'}検索できる！</T>
    <Shot src="off_top.png" w={620} h={1050} y={640} from={0} to={22} delay={14} />
  </>},
  {n: 4, el: <>
    <T y={260} size={84}>今までは PDF…</T>
    <Shot src="pdf-01.png" w={760} h={1080} y={480} from={0} to={45} />
  </>},
  {n: 5, src: OFFICIAL, el: <>
    <T y={250} size={96}>くるくるサーチ！</T>
    <Shot src="off_list.png" w={620} h={1150} y={460} from={8} to={30} delay={4} />
  </>},
  {n: 6, src: OFFICIAL, el: <>
    <T y={240} size={96}>個人的激アツ！</T>
    <T y={380} size={66} delay={14}>排出カードの弾数まで分かる</T>
    <Shot src="off_detail1.png" w={620} h={1100} y={520} from={20} to={30} delay={8} />
  </>},
  {n: 7, src: OFFICIAL, el: <>
    <T y={240} size={76}>2弾になっても{'\n'}1弾が出るお店が分かる！</T>
    <Pic src="off_detail2.png" w={900} y={620} zoom={[1, 1.08]} delay={6} />
  </>},
  {n: 8, el: <>
    <T y={240} size={84}>お店の検索といえば…</T>
    <T y={380} size={110} delay={18}>「あのサイト」</T>
    <Shot src="navi.png" w={480} h={1000} y={620} from={0} to={10} delay={10} mosaic />
  </>},
  {n: 9, el: <>
    <T y={300} size={96}>そうです、{'\n'}あのサイトです。</T>
    <Shot src="navi.png" w={520} h={1050} y={600} from={10} to={14} mosaic />
  </>},
  {n: 10, el: <>
    <T y={300} size={80}>あのサイト使ってた人{'\n'}正直に手を挙げなさい</T>
    <T y={560} size={60} delay={70}>（先生怒んないから）</T>
    <Pic src="moja_think.png" w={420} y={900} blend />
  </>},
  {n: 11, gray: true, el: <>
    <T y={420} size={130}>…はい。</T>
    <Pic src="moja_excite.png" w={560} y={820} blend />
  </>},
  {n: 12, el: <>
    <T y={320} size={92}>あのサイトと{'\n'}比べてみる！</T>
    <Shot src="off_top.png" w={400} h={720} x={300} y={760} delay={6} />
    <T y={1080} size={110} delay={12}>vs</T>
    <Shot src="navi.png" w={400} h={720} x={780} y={760} delay={10} mosaic />
  </>},
  {n: 13, el: <>
    <T y={560} size={90}>大きな違いは</T>
    <T y={740} size={140} delay={20}>更新方法</T>
    <Pic src="moja_stand.png" w={300} y={1120} blend />
  </>},
  {n: 14, el: <>
    <T y={260} size={84}>公式サイト{'  '}あのサイト</T>
    <Pic src="cabinet.png" w={340} x={290} y={500} delay={4} />
    <Label x={290} y={1130} delay={10}>筐体との通信</Label>
    <Pic src="moja_phone.png" w={420} x={790} y={620} delay={70} blend />
    <Label x={790} y={1130} delay={80}>口コミ</Label>
  </>},
  {n: 15, el: <>
    <T y={260} size={76}>一見、公式サイトの方が{'\n'}いいのでは？</T>
    <Pic src="cabinet.png" w={500} y={560} zoom={[1, 1.05]} />
  </>},
  {n: 16, gray: true, el: <>
    <T y={260} size={110}>落とし穴</T>
    <T y={430} size={72} delay={60}>動いてなくても{'\n'}「稼働中」…？？？？</T>
    <Pic src="off_detail2.png" w={860} y={760} delay={40} />
    <Small y={1600}>※公式サイトより「最終更新日から長時間が経過しているお店では、カード切れ等で稼働停止している場合もあります」</Small>
  </>},
  {n: 17, gray: true, el: <>
    <T y={250} size={84}>最終更新：2日前で{'\n'}「稼働中」</T>
    <Pic src="off_detail2.png" w={1000} y={560} zoom={[1, 1.25]} />
    <T y={1350} size={110} delay={60}>お察し…</T>
  </>},
  {n: 18, el: <>
    <T y={250} size={84}>あのサイトは{'\n'}目撃情報の口コミ</T>
    <T y={480} size={104} delay={70}>案外正確！</T>
    <Shot src="navi.png" w={480} h={900} y={700} from={20} to={26} mosaic />
  </>},
  {n: 19, el: <>
    <T y={260} size={76}>嘘の書き込みも…</T>
    <T y={420} size={76} delay={150}>使ってる人が多いから{'\n'}すぐ上書きされる！</T>
    <Pic src="moja_pc.png" w={620} y={820} blend />
  </>},
  {n: 20, el: <>
    <T y={260} size={96}>しかも</T>
    <Label x={540} y={520} delay={10} size={80}>待機人数</Label>
    <Label x={540} y={720} delay={40} size={80}>録画機</Label>
    <Pic src="moja_oh.png" w={300} y={1000} blend />
  </>},
  {n: 21, el: <>
    <T y={300} size={76}>稼働日 10/8{'\n'}→ 翌日 10/9 にリリース</T>
    <T y={620} size={104} delay={110}>至れり尽くせり</T>
    <Pic src="moja_dash.png" w={520} y={900} blend />
  </>},
  {n: 22, gray: true, el: <>
    <T y={380} size={100} shake>え待って</T>
    <T y={560} size={84} delay={10} shake>公式サイトより{'\n'}優秀じゃん</T>
    <Pic src="moja_surprise.png" w={560} y={880} blend />
  </>},
  {n: 23, src: OFFICIAL, el: <>
    <T y={250} size={80}>公式サイトは</T>
    <T y={390} size={104} delay={20}>進化の可能性！</T>
    <Shot src="off_top.png" w={600} h={950} y={620} from={0} to={6} />
  </>},
  {n: 24, el: <>
    <T y={420} size={110}>てな訳で、{'\n'}以上です！</T>
    <Pic src="group.png" w={760} y={760} />
  </>},
  {n: 25, el: <>
    <T y={360} size={110}>ちなみに</T>
    <Pic src="ichigo_smile.png" w={460} y={720} />
  </>},
  {n: 26, el: <>
    <T y={250} size={74}>あのサイトと{'\n'}ゲーセンの公式Xで{'\n'}お店を決めてた</T>
    <Shot src="navi.png" w={420} h={760} x={310} y={720} mosaic />
    <Pic src="moja_phone.png" w={420} x={790} y={820} delay={20} blend />
  </>},
  {n: 27, el: <>
    <T y={260} size={72}>どこが稼働してるか{'\n'}分からない！を解決</T>
    <T y={560} size={130} delay={120}>感謝！</T>
    <Pic src="group.png" w={760} y={760} delay={120} />
  </>},
  {n: 28, el: <>
    <T y={260} size={110}>三段活用</T>
    <Label x={540} y={560} delay={10} size={64}>① あのサイト</Label>
    <Label x={540} y={760} delay={50} size={64}>② ゲーセンのX</Label>
    <Label x={540} y={960} delay={90} size={64}>③ 公式サイト</Label>
    <Pic src="moja_stand.png" w={260} y={1200} blend />
  </>},
  {n: 29, el: <>
    <T y={360} size={84}>それぞれ参考にしながら{'\n'}アイカツしていこう！</T>
    <Pic src="ichigo_wink.png" w={480} y={760} />
  </>},
  {n: 30, el: <>
    <T y={360} size={84}>さて、{'\n'}あのサイト見るか。。。</T>
    <Pic src="moja_pc.png" w={620} y={760} blend />
  </>},
];

const Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sad = frame > fps * 5.5;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Img src={a('end_denied.png')} style={{position: 'absolute', width: 1080, top: 420}} />
      {sad && <>
        <AbsoluteFill style={{background: 'rgba(0,0,0,.35)'}} />
        <Pic src="moja_sad.png" w={460} y={1300} style={{filter: 'invert(1)'}} />
        <div style={{position: 'absolute', top: 1180, width: '100%', textAlign: 'center', fontSize: 180}}>
          <span style={{display: 'inline-block', transform: `scale(${spring({frame: frame - fps * 5.5, fps})})`}}>😭</span>
        </div>
      </>}
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => (
  <AbsoluteFill>
    <Pic src="icon.png" w={300} y={720} />
    <Pic src="sign.png" w={560} y={1080} delay={6} style={{filter: 'invert(1) brightness(.2)'}} />
  </AbsoluteFill>
);

// ---- composition -------------------------------------------------------------
export const Shoplist: React.FC = () => {
  const {fps} = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender('fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const done = () => {
      setReady(true);
      continueRender(handle);
    };
    document.fonts.load('80px "Mochiy Pop One"', 'あいうアイウ公式サイト稼働中').then(done, done);
  }, [handle]);
  const f = (s: number) => Math.round(s * fps);
  const t = frame / fps;
  const cur = scenes.find((s) => {
    const [st, en] = sceneSpan(s.n);
    return t >= st && t < en;
  });
  const endingStart = NARR_OUT;
  if (!ready) return null;
  return (
    <AbsoluteFill style={{background: '#fdf3f6'}}>
      <Img src={a('bg.png')} style={{position: 'absolute', width: 1080, height: 1920, objectFit: 'cover'}} />
      {scenes.map((s) => {
        const [st, en] = sceneSpan(s.n);
        return (
          <Sequence key={s.n} from={f(st)} durationInFrames={f(en) - f(st)}>
            {s.gray && <Gray />}
            {s.el}
          </Sequence>
        );
      })}
      <Sequence from={f(endingStart)} durationInFrames={f(ENDING_SEC)}><Ending /></Sequence>
      <Sequence from={f(endingStart + ENDING_SEC)}><EndCard /></Sequence>

      {t < endingStart && <>
        <div style={{position: 'absolute', top: 18, left: 24, fontSize: 22, color: '#c98aa6', fontFamily: 'sans-serif'}}>
          ©BNP/BANDAI, DENTSU, TV TOKYO
        </div>
        {cur?.src && (
          <div style={{position: 'absolute', bottom: 22, width: '100%', textAlign: 'center', fontSize: 22, color: '#c98aa6', fontFamily: 'sans-serif'}}>
            {cur.src}
          </div>
        )}
      </>}

      {/* audio */}
      <Sequence durationInFrames={f(CUT_FROM)}>
        <Audio src={a('narration.m4a')} endAt={f(CUT_FROM)} />
      </Sequence>
      <Sequence from={f(CUT_FROM)} durationInFrames={f(NARR_OUT - CUT_FROM)}>
        <Audio src={a('narration.m4a')} startFrom={f(CUT_TO)} endAt={f(NARR_END)} />
      </Sequence>
      <Sequence durationInFrames={f(endingStart + 1)}>
        <Audio src={a('bgm.mp3')} volume={(fr) => interpolate(fr, [0, f(endingStart - 1), f(endingStart + 1)], [0.12, 0.12, 0], {extrapolateRight: 'clamp'})} />
      </Sequence>
      <Sequence from={f(endingStart)}>
        <Audio src={a('hotaru.m4a')} startFrom={f(0.5)} volume={(fr) => interpolate(fr, [0, f(1), f(ENDING_SEC + ENDCARD_SEC - 2), f(ENDING_SEC + ENDCARD_SEC)], [0, 0.5, 0.5, 0], {extrapolateRight: 'clamp'})} />
      </Sequence>
    </AbsoluteFill>
  );
};
