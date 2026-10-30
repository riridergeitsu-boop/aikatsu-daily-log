# Align script lines to narration using silence gaps + char counts.
import json, sys
lines = [
"あそべるお店がわかる！",
"アイカツアンコールの公式サイトが更新されたので見ていく！",
"ついに！アイカツアンコールの公式サイトで、あそべるお店が検索できるようになりました！",
"つい最近までpdfで見る必要があり大変でしたが、",
"これでカンタンにくるくるサーチできますね。",
"個人的激アツだと思ったのは、排出カードの弾数まで分かるところ！",
"2弾になっても1弾のカードが買える！ってのがわかるのは激アツですね。",
"お店を検索できる！といえば、個人制作の「あのサイト」がありましたよね。",
"そうです、あのサイトです。",
"えー、あのサイト使ってた人、正直に手を挙げてください。先生怒んないから。",
"…はい。",
"てな訳で、あのサイトと比べてみます！",
"この2つの大きな違いは、情報の更新方法。",
"公式サイトは「筐体との通信」で、あのサイトは「口コミ」",
"一見、筐体との通信をしている公式サイトの方がいいのでは？と思いますが、",
"実は落とし穴があって、なんと稼働していなくても「稼働中」の表記になってることがあるみたいです？？？？",
"更新日2日前で「稼働中」、これはもうお察しですね。",
"対してあのサイトは目撃情報による口コミなので、案外正確なんですよね。",
"もちろん、嘘の書き込みをされる可能性もありますが、使っている人が多いので、間違った情報もすぐ上書きされやすい印象ですね",
"しかも、待機人数、録画機もあって、",
"なんならこのサイトは稼働日の翌日にはリリースされてたので、もう至れり尽くせりですね。",
"(え待って公式サイトより優秀じゃん)",
"公式サイトはまだまだ進化の可能性がありますね！",
"てな訳で、以上です！",
"ちなみにいちずは、アイカツアンコールを遊ぶ時、",
"あのサイトを参考にしながら、ゲームセンターの公式Xを見て、遊ぶお店を決めてました。",
"どこが稼働しているか分からない！そんな状況を改善してくれたあのサイトには感謝ですね。",
"これからは、あのサイト、ゲームセンターのX、公式サイトの三段活用になりそうですね。",
"それぞれ参考にしながら、アイカツしていこうと思います！",
"さて、あのサイト見るか。。。",
]
import re
def w(s): return len(re.sub(r"[、。！？「」（）()…\s？]", "", s)) + 0.5
sil = [tuple(map(float, l.split())) for l in open(sys.argv[1]) if l.strip()]
end = float(sys.argv[2])
speech_start = sil[0][1] if sil[0][0] < 2.5 else 0.0
speech_start = 0.0
# speech intervals
iv=[]; t=speech_start
for a,b in sil:
    if a>t: iv.append((t,a))
    t=max(t,b)
if t<end: iv.append((t,end))
tot=sum(b-a for a,b in iv)
def at(frac):
    x=frac*tot
    for a,b in iv:
        if x<=b-a: return a+x
        x-=b-a
    return end
W=[w(s) for s in lines]; S=sum(W); cum=0; bounds=[0.0]
mids=[(a+b)/2 for a,b in sil]
for i in range(len(lines)-1):
    cum+=W[i]; tgt=at(cum/S)
    c=min(mids,key=lambda m: abs(m-tgt))
    if c<=bounds[-1]+0.8: c=tgt
    bounds.append(round(c,2))
bounds.append(end)
out=[{"i":i+1,"text":lines[i],"start":bounds[i],"end":bounds[i+1]} for i in range(len(lines))]
json.dump(out,open(sys.argv[3],"w"),ensure_ascii=False,indent=1)
for o in out: print(f'{o["i"]:2d} {o["start"]:6.2f}-{o["end"]:6.2f} {o["text"][:30]}')
