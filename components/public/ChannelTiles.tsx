/** Code-native illustration, separate from the labelled example workspace. */
export default function ChannelTiles() {
  return <div className="channel-landscape" aria-hidden="true">
    <div className="channel-tile tile-community"><svg viewBox="0 0 80 80" fill="none"><ellipse cx="40" cy="42" rx="28" ry="18" stroke="currentColor" strokeWidth="5" strokeDasharray="13 11" />{[[14,32],[40,24],[66,32],[40,60]].map(([cx,cy])=><ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="10" ry="6" fill="currentColor" />)}</svg></div>
    <div className="channel-tile tile-chart"><svg viewBox="0 0 80 80" fill="currentColor"><rect x="13" y="36" width="12" height="30" rx="3"/><rect x="34" y="17" width="12" height="49" rx="3"/><rect x="55" y="28" width="12" height="38" rx="3"/></svg></div>
    <div className="channel-tile tile-panora"><svg viewBox="0 0 80 80" fill="none"><path d="M14 48c10 0 8-25 20-25s7 34 19 34 7-40 16-40" stroke="currentColor" strokeWidth="10" strokeLinecap="round" /></svg></div>
    <div className="channel-tile tile-insight"><svg viewBox="0 0 80 80" fill="currentColor"><path d="M46 8 17 44h22l-6 29 31-39H43z" /></svg></div>
    <div className="channel-tile tile-audience"><svg viewBox="0 0 80 80" fill="currentColor"><ellipse cx="40" cy="55" rx="29" ry="17"/><rect x="19" y="22" width="42" height="30" rx="20"/><ellipse cx="40" cy="23" rx="23" ry="11"/></svg></div>
  </div>;
}
