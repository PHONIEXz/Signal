import { measured, metricDate, type CollectedPost } from "./metric-measurements.ts";

export function parseMetricCsv(csv: string, platform: string, limit: number): CollectedPost[] {
  if (Buffer.byteLength(csv,"utf8") > 524288) throw new Error("Use a CSV smaller than 512 KB.");
  const rows: string[][] = []; let row:string[]=[]; let cell=""; let quoted=false; let closed=false;
  const endCell=()=>{row.push(cell);cell="";closed=false;};
  for(let i=0;i<csv.length;i++) {
    const c=csv[i];
    if(quoted) {if(c==='"') {if(csv[i+1]==='"'){cell+='"';i++;}else {quoted=false;closed=true;}}else cell+=c;continue;}
    if(c==='"') {if(cell || closed)throw new Error("Malformed CSV quoting.");quoted=true;continue;}
    if(c===","){endCell();continue;}
    if(c==="\n" || c==="\r") {if(c==="\r"&&csv[i+1]==="\n")i++;endCell();if(row.some(Boolean))rows.push(row);row=[];if(rows.length>101)throw new Error("Import at most 100 rows at a time.");continue;}
    if(closed)throw new Error("Malformed CSV quoting.");cell+=c;
  }
  if(quoted)throw new Error("Unclosed CSV quote.");
  endCell();if(row.some(Boolean))rows.push(row);
  const header=rows.shift()?.map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase().replace(/[\s-]+/g,"_"));
  if(!header || new Set(header).size!==header.length)throw new Error("Use unique CSV column names.");
  const find=(...names:string[])=>names.map(n=>header.indexOf(n)).find(i=>i>=0)??-1;
  const id=find("platform_post_id","post_id","tweet_id","video_id"); const text=find("text","post_text","tweet_text","description");
  if(id<0 || text<0)throw new Error("Include platform_post_id and text columns (post_id/tweet_id/video_id are also accepted).");
  if(!rows.length || rows.length>limit)throw new Error(`Import between 1 and ${limit} posts for your plan.`);
  const ids=new Set<string>();
  const count=(r:string[],...aliases:string[])=>{const i=find(...aliases);if(i<0||!r[i]?.trim())return null;const raw=r[i].trim();if(!/^\d+$/.test(raw)||measured(Number(raw))===null)throw new Error("Counts must be nonnegative whole numbers; leave unknown values blank.");return Number(raw);};
  return rows.map(r=>{
    if(r.length!==header.length)throw new Error("Each CSV row must match the header columns.");
    const postId=r[id].trim();if(!(platform === "facebook" ? /^\d+(?:_\d+)?$/ : /^\d+$/).test(postId)||ids.has(postId))throw new Error("Use unique numeric platform post IDs (Facebook Page_post IDs are supported).");ids.add(postId);
    if(r[text].length>20000)throw new Error("Keep each post text within 20,000 characters.");
    const dateIndex=find("posted_at","created_at","time");const rawDate=dateIndex<0?"":r[dateIndex].trim();const postedAt=rawDate?metricDate(rawDate):null;
    if(rawDate&&!postedAt)throw new Error("Use valid ISO dates in posted_at.");
    return {id:postId,text:r[text],postedAt,url:platform==="x"?`https://x.com/i/web/status/${postId}`:platform==="facebook"?`https://www.facebook.com/${postId}`:null,
      likeCount:platform==="facebook"?count(r,"reactions"):count(r,"likes"),viewCount:platform==="facebook"?null:count(r,"views","impressions"),
      replyCount:count(r,"comments","replies"),retweetCount:count(r,"shares","reposts","retweets"),quoteCount:platform==="x"?count(r,"quotes"):0};
  });
}
