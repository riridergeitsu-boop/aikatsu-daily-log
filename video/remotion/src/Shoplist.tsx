import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate,
  staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';

// ---- timing --------------------------------------------------------------
// All cut times are narration-source seconds (from silence/ASR alignment).
// The narration TTS also read the caption note (CUT_FROM..CUT_TO) and the stage
// directions after the last line (NARR_END); both are cut from the audio.
const CUT_FROM = 74.67;
const CUT_TO = 85.92;
const NARR_END = 158.85;
const toOut = (t: number) => (t >= CUT_TO ? t - (CUT_TO - CUT_FROM) : t);
const NARR_OUT = toOut(NARR_END);
const ENDING_SEC = 5;
export const TOTAL_SEC = NARR_OUT + ENDING_SEC;

// Still's drums come in at 10.5s; start the track 4.3s in so they land right after "見ていく！".
const BGM_OFFSET = 4.3;

// ---- look ----------------------------------------------------------------
// Plain cuts, small telops, uncropped-looking images: keep it hand-made and easy to read.
const PINK = '#e8317c';
const FONT = '"Yurka", "ユールカ", "Mochiy Pop One", sans-serif';
const a = (f: string) => staticFile(`a/${f}`);

const T: React.FC<{children: React.ReactNode; y?: number; size?: number}> = ({children, y = 330, size = 66}) => (
  <div style={{
    position: 'absolute', top: y, left: 40, right: 40, textAlign: 'center', fontFamily: FONT,
    fontSize: size, lineHeight: 1.3, color: PINK, whiteSpace: 'pre-line',
    WebkitTextStroke: '8px white', paintOrder: 'stroke fill',
  }}>{children}</div>
);

// Connecting words ("なんと、" "てな訳で、") alone in the middle of the screen.
const Mid: React.FC<{children: React.ReactNode}> = ({children}) => <T y={900} size={56}>{children}</T>;

// Big emphasis laid over the picture.
const Big: React.FC<{children: React.ReactNode; y?: number; rotate?: number}> = ({children, y = 860, rotate = -6}) => (
  <div style={{
    position: 'absolute', top: y, left: 0, right: 0, textAlign: 'center', fontFamily: FONT,
    fontSize: 150, color: PINK, WebkitTextStroke: '22px white', paintOrder: 'stroke fill',
    transform: `rotate(${rotate}deg)`, whiteSpace: 'pre-line', lineHeight: 1.15,
  }}>{children}</div>
);

const Pic: React.FC<{src: string; w: number; x?: number; y?: number; style?: React.CSSProperties}> = ({src, w, x = 540, y = 520, style}) => (
  <Img src={a(src)} style={{position: 'absolute', width: w, left: x - w / 2, top: y, ...style}} />
);

// Screenshot with a soft shadow so it reads as a card on the pink background.
const Shot: React.FC<{src: string; w: number; x?: number; y?: number; mosaic?: boolean}> = ({src, w, x = 540, y = 520, mosaic}) => (
  <div style={{position: 'absolute', left: x - w / 2, top: y, width: w}}>
    <Img src={a(src)} style={{width: '100%', display: 'block', boxShadow: '0 6px 20px rgba(200,80,130,.18)'}} />
    {mosaic && <Note y={-44}>※モザイク</Note>}
  </div>
);

const Note: React.FC<{children: React.ReactNode; y: number}> = ({children, y}) => (
  <div style={{position: 'absolute', top: y, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 28, color: PINK}}>{children}</div>
);

const Label: React.FC<{children: React.ReactNode; y: number; size?: number}> = ({children, y, size = 60}) => (
  <div style={{position: 'absolute', top: y, left: '50%', transform: 'translateX(-50%)', background: 'white',
    border: `5px solid ${PINK}`, borderRadius: 999, padding: '8px 34px', fontFamily: FONT, fontSize: size, color: PINK, whiteSpace: 'nowrap'}}>
    {children}
  </div>
);

const Gray: React.FC = () => <AbsoluteFill style={{background: 'rgba(60,50,60,.42)'}} />;

const NOTE_OFFICIAL = '※公式サイトより「最終更新日から長時間が経過しているお店では、カード切れ等で稼働停止している場合もあります」';

// ---- cuts ------------------------------------------------------------------
// t: narration-source time the cut starts; it lasts until the next cut.
type Cut = {t: number; gray?: boolean; official?: boolean; el: React.ReactNode};
const navi = <Shot src="c_navi_top.png" w={520} y={520} mosaic />;
const naviCards = <Shot src="c_navi_cards.png" w={520} y={520} mosaic />;

const cuts: Cut[] = [
  {t: 0, official: true, el: <><T>あそべるお店が{'\n'}わかる！</T><Shot src="c_top_title.png" w={900} y={620} /></>},
  {t: 1.82, el: <><T>公式サイト更新！</T><Shot src="c_post.png" w={760} y={480} /></>},
  {t: 5.3, el: <><T>見ていく！</T><Pic src="ichigo_smile.png" w={380} y={560} /></>},
  {t: 6.15, el: <Mid>ついに！</Mid>},
  {t: 6.6, official: true, el: <><T>公式サイトで</T><Shot src="c_top_title.png" w={900} y={560} /></>},
  {t: 9.1, official: true, el: <><T>あそべるお店が</T><Shot src="c_top_search.png" w={900} y={540} /></>},
  {t: 10.3, official: true, el: <><T>検索できる！</T><Shot src="c_top_search.png" w={900} y={540} /></>},
  {t: 12.45, el: <><T>今まではPDF</T><Note y={470}>▼取扱店舗一覧（PDF）</Note><Shot src="pdf-01.png" w={760} y={520} /></>},
  {t: 15.4, el: <><T>大変…</T><Shot src="pdf-01.png" w={760} y={520} /><Pic src="moja_think.png" w={260} x={880} y={1260} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 16.95, official: true, el: <><T>これでカンタンに</T><Shot src="c_list.png" w={820} y={520} /></>},
  {t: 17.75, official: true, el: <><T>くるくるサーチ！</T><Shot src="c_list.png" w={820} y={520} /></>},
  {t: 19.91, el: <Mid>個人的激アツなのは、</Mid>},
  {t: 22.4, official: true, el: <><T>排出カードの弾数！</T><Shot src="c_d1_box.png" w={880} y={560} /></>},
  {t: 25.3, official: true, el: <><T>2弾になっても</T><Shot src="c_d1_box.png" w={880} y={560} /></>},
  {t: 26.4, official: true, el: <><T>1弾が買える！</T><Shot src="c_d1_box.png" w={880} y={560} /></>},
  {t: 29.4, official: true, el: <><T>1弾が買える！</T><Shot src="c_d1_box.png" w={880} y={560} /><Big y={1000}>激アツ！</Big></>},
  {t: 30.89, el: <Mid>お店の検索といえば、</Mid>},
  {t: 33.9, el: <><T>あのサイト</T>{navi}</>},
  {t: 37.51, el: <Mid>そうです。</Mid>},
  {t: 38.4, el: <><T>あのサイトです。</T>{navi}</>},
  {t: 39.64, el: <><T>あのサイト使ってた人</T><Pic src="moja_stand.png" w={320} y={640} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 42.4, el: <><T>正直に手を挙げなさい</T><Pic src="moja_stand.png" w={320} y={640} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 45.1, el: <><T>先生怒んないから</T><Pic src="moja_stand.png" w={320} y={640} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 46.6, gray: true, el: <><T>…はい。</T><Pic src="moja_excite.png" w={460} y={560} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 47.59, el: <Mid>てな訳で、</Mid>},
  {t: 48.9, el: <><T>比べてみる！</T><Shot src="c_top_title.png" w={460} x={290} y={620} /><Shot src="c_navi_top.png" w={300} x={800} y={620} /></>},
  {t: 50.3, el: <Mid>大きな違いは、</Mid>},
  {t: 53.2, el: <T y={860} size={96}>更新方法！</T>},
  {t: 54.9, el: <><T>公式サイトは</T><Pic src="cabinet.png" w={420} y={500} /></>},
  {t: 56.8, el: <><T>筐体との通信</T><Pic src="cabinet.png" w={420} y={500} /></>},
  {t: 58.5, el: <><T>あのサイトは</T>{navi}</>},
  {t: 60.0, el: <><T>口コミ</T>{navi}<Pic src="moja_phone.png" w={340} x={860} y={1260} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 60.98, el: <Mid>一見、</Mid>},
  {t: 61.5, el: <><T>公式の方が{'\n'}いいのでは？</T><Pic src="cabinet.png" w={420} y={560} /></>},
  {t: 67.35, el: <Mid>実は、</Mid>},
  {t: 67.75, gray: true, el: <Big y={760} rotate={0}>落とし穴</Big>},
  {t: 69.0, official: true, el: <><T>稼働してなくても</T><Shot src="c_d2_head.png" w={700} y={620} /></>},
  {t: 71.1, official: true, el: <><T>「稼働中」に…？</T><Shot src="c_d2_head.png" w={700} y={620} /></>},
  {t: 72.8, gray: true, el: <><T y={420} size={96}>？？？？？</T><Pic src="moja_surprise.png" w={420} y={640} style={{mixBlendMode: 'multiply'}} /><Note y={1500}>{NOTE_OFFICIAL}</Note></>},
  {t: CUT_TO, official: true, el: <><T>最終更新：2日前で</T><Shot src="c_d2_box.png" w={900} y={560} /></>},
  {t: 88.85, gray: true, official: true, el: <><T>「稼働中」</T><Shot src="c_d2_box.png" w={900} y={560} /><Big y={1080}>お察し…</Big></>},
  {t: 90.0, el: <><T>あのサイトは</T>{naviCards}</>},
  {t: 92.1, el: <><T>目撃情報の口コミ</T>{naviCards}</>},
  {t: 94.8, el: <><T>目撃情報の口コミ</T>{naviCards}<Big y={1000}>案外正確！</Big></>},
  {t: 96.95, el: <><T>嘘の書き込みも…</T><Pic src="moja_pc.png" w={540} y={600} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 100.5, el: <><T>使ってる人が多い</T><Pic src="moja_pc.png" w={540} y={600} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 103.1, el: <><T>すぐ上書きされる！</T><Pic src="moja_pc.png" w={540} y={600} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 107.38, el: <Mid>しかも、</Mid>},
  {t: 108.0, el: <><T>待機人数</T>{naviCards}</>},
  {t: 109.2, el: <><T>録画機</T>{naviCards}</>},
  {t: 110.98, el: <Mid>なんなら、</Mid>},
  {t: 112.1, el: <><T>稼働日の翌日に</T><Label y={620} size={64}>稼働日 10/8</Label><Label y={820} size={64}>リリース 10/9</Label></>},
  {t: 113.6, el: <><T>リリース！</T><Label y={620} size={64}>稼働日 10/8</Label><Label y={820} size={64}>リリース 10/9</Label></>},
  {t: 115.3, el: <><T>もう</T><Big y={760} rotate={-4}>至れり{'\n'}尽くせり</Big></>},
  {t: 117.8, gray: true, el: <><T>え待って</T><Pic src="moja_surprise.png" w={460} y={600} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 118.3, gray: true, el: <><T>公式サイトより{'\n'}優秀じゃん</T><Pic src="moja_surprise.png" w={460} y={640} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 120.68, official: true, el: <><T>公式サイトは</T><Shot src="c_top_title.png" w={900} y={600} /></>},
  {t: 122.3, official: true, el: <><T>進化の可能性！</T><Shot src="c_top_title.png" w={900} y={600} /></>},
  {t: 124.61, el: <><T y={800} size={56}>てな訳で、以上！</T><Pic src="group.png" w={520} y={820} /></>},
  {t: 126.59, el: <Mid>ちなみに、</Mid>},
  {t: 127.3, el: <><T>いちずは</T><Pic src="icon.png" w={200} y={540} /></>},
  {t: 130.2, el: <><T>あのサイトと</T>{navi}</>},
  {t: 132.9, el: <><T>ゲーセンの公式X</T><Pic src="moja_phone.png" w={460} y={560} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 135.6, el: <><T>でお店を決めてた</T><Pic src="moja_phone.png" w={460} y={560} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 138.1, el: <><T>どこが稼働してるか{'\n'}分からない！</T><Pic src="moja_think.png" w={340} y={700} style={{mixBlendMode: 'multiply'}} /></>},
  {t: 140.5, el: <><T>それを解決！</T>{navi}</>},
  {t: 143.6, el: <><T>あのサイトに</T>{navi}<Big y={1000}>感謝！</Big></>},
  {t: 144.66, el: <Mid>これからは、</Mid>},
  {t: 145.6, el: <><T>三段活用</T><Label y={560}>あのサイト</Label></>},
  {t: 146.5, el: <><T>三段活用</T><Label y={560}>あのサイト</Label><Label y={740}>ゲーセンのX</Label></>},
  {t: 148.2, el: <><T>三段活用</T><Label y={560}>あのサイト</Label><Label y={740}>ゲーセンのX</Label><Label y={920}>公式サイト</Label></>},
  {t: 152.36, el: <><T>アイカツしていこう！</T><Pic src="ichigo_wink.png" w={400} y={560} /></>},
  {t: 156.59, el: <Mid>さて、</Mid>},
  {t: 157.0, el: <><T>あのサイト見るか。。。</T><Pic src="moja_pc.png" w={540} y={600} style={{mixBlendMode: 'multiply'}} /></>},
];

// Service-ended screen: a still with no motion; only 😭 fades in.
const Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const o = interpolate(frame, [fps * 1.2, fps * 2.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Img src={a('end_denied.png')} style={{position: 'absolute', width: 1080, top: 420}} />
      <div style={{position: 'absolute', top: 1380, width: '100%', textAlign: 'center', fontSize: 170, opacity: o}}>😭</div>
    </AbsoluteFill>
  );
};

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
  const starts = cuts.map((c) => toOut(c.t));
  const curIdx = starts.findIndex((s, i) => t >= s && t < (starts[i + 1] ?? NARR_OUT));
  const cur = cuts[curIdx];
  if (!ready) return null;
  return (
    <AbsoluteFill style={{background: '#fdf3f6'}}>
      <Img src={a('bg.png')} style={{position: 'absolute', width: 1080, height: 1920, objectFit: 'cover'}} />
      {cuts.map((c, i) => {
        const st = starts[i];
        const en = starts[i + 1] ?? NARR_OUT;
        return (
          <Sequence key={i} from={f(st)} durationInFrames={f(en) - f(st)}>
            {c.gray && <Gray />}
            {c.el}
          </Sequence>
        );
      })}
      <Sequence from={f(NARR_OUT)}><Ending /></Sequence>

      {t < NARR_OUT && <>
        <div style={{position: 'absolute', top: 18, left: 24, fontSize: 22, color: '#c98aa6', fontFamily: 'sans-serif'}}>
          ©BNP/BANDAI, DENTSU, TV TOKYO
        </div>
        {cur?.official && (
          <div style={{position: 'absolute', bottom: 22, width: '100%', textAlign: 'center', fontSize: 22, color: '#c98aa6', fontFamily: 'sans-serif'}}>
            https://dcd.aikatsu.com/encore/shoplist/
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
      <Sequence durationInFrames={f(NARR_OUT + 0.6)}>
        <Audio src={a('bgm.mp3')} startFrom={f(BGM_OFFSET)}
          volume={(fr) => interpolate(fr, [0, f(NARR_OUT - 0.4), f(NARR_OUT + 0.6)], [0.12, 0.12, 0], {extrapolateRight: 'clamp'})} />
      </Sequence>
      <Sequence from={f(NARR_OUT)}>
        <Audio src={a('hotaru.m4a')} startFrom={f(0.5)}
          volume={(fr) => interpolate(fr, [0, f(0.3), f(ENDING_SEC - 1.2), f(ENDING_SEC)], [0, 0.5, 0.5, 0], {extrapolateRight: 'clamp'})} />
      </Sequence>
    </AbsoluteFill>
  );
};
