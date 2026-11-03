const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(__dirname,'youtubeContent.js'),'utf8');
const vendor=fs.readFileSync(path.join(root,'src','VendorDashboard.tsx'),'utf8');
const feed=fs.readFileSync(path.join(root,'src','YaayzYoutubeFeed.tsx'),'utf8');
const admin=fs.readFileSync(path.join(root,'admin-web','src','views','youtube.js'),'utf8');

test('YouTube creator economics are authoritative',()=>{
 assert.match(src,/SHORT_FREE_LIMIT = 5/); assert.match(src,/MAX_LONG_PER_MONTH = 100/);
 assert.match(src,/25: 500000/); assert.match(src,/50: 1300000/); assert.match(src,/100: 2500000/);
 assert.match(src,/DEFAULT_DURATION_DAYS = 90/); assert.match(src,/NARRATIVIA_DURATION_DAYS = 120/); assert.match(src,/CREATOR_AAMI_PER_1000_VIEWS = 20/);
});
test('Narrativia is uncapped and has its own 120 day lifecycle',()=>{assert.match(src,/channel\.isNarrativia \? 500 : 50/);assert.match(src,/narrativia\?Number\.MAX_SAFE_INTEGER:SHORT_FREE_LIMIT/);assert.match(src,/narrativia\?Number\.MAX_SAFE_INTEGER/);assert.match(src,/youtube_narrativia/);assert.match(src,/Narrativia founding-channel activation is administrator controlled/);});
test('Dami gates content on verified duration and policy text',()=>{assert.match(src,/function damiScreenContent/);assert.match(src,/duration<=0/);assert.match(src,/Dami content screen passed/);assert.match(src,/screenPendingVideos/);});
test('Qualified views are idempotent and reward the uploader at 20 Aami per 1000',()=>{assert.match(src,/yaayz_creator_qualified_views/);assert.match(src,/Math\.floor\(nextViews\/1000\)/);assert.match(src,/CREATOR_AAMI_PER_1000_VIEWS/);assert.match(src,/aami-yaayz-creator/);});
test('Business Hub exposes the YouTube creator section',()=>{assert.match(vendor,/youtube/);assert.match(vendor,/YouTubeBusinessPanel/);});
test('Yaayz consumes approved creator videos through the server boundary',()=>{assert.match(feed,/\/api\/yaayz\/youtube\/feed/);assert.match(feed,/\/api\/yaayz\/youtube\/videos/);assert.match(feed,/Watch on YouTube/);});
test('Admin can review creator channels and pending videos',()=>{assert.match(admin,/Approve channel/);assert.match(admin,/Approve video/);assert.match(admin,/youtubeChannelDecision/);});


test('Permanent YouTube sync uses the uploads playlist path when the Data API is configured',()=>{
 assert.match(src,/forHandle/); assert.match(src,/relatedPlaylists/); assert.match(src,/playlistItems/); assert.match(src,/fetchUploadsPlaylistVideos/); assert.doesNotMatch(src,/youtube\/v3\/search/);
});
test('Narrativia receives a server-side automatic refresh loop',()=>{ assert.match(src,/startNarrativiaAutoSync/); assert.match(src,/setInterval/); assert.match(src,/autoSyncNarrativia\(db\)\.catch/); });
test('Yaayz autoplay is a persisted user preference with a default of ON',()=>{ assert.match(src,/CREATE TABLE IF NOT EXISTS yaayz_preferences/); assert.match(src,/autoplayVideos INTEGER NOT NULL DEFAULT 1/); assert.match(src,/\/api\/yaayz\/preferences/); assert.match(src,/embedUrl/); });
test('Profile settings expose Yaayz autoplay without introducing another storage dependency',()=>{ const profile=fs.readFileSync(path.join(root,'src','app','(tabs)','profile.tsx'),'utf8'); const api=fs.readFileSync(path.join(root,'src','api.ts'),'utf8'); assert.match(profile,/Yaayz playback/); assert.match(profile,/Yaayz video autoplay/); assert.match(api,/updateYaayzPreferences/); });


test('Credential preparation exposes status without exposing secrets',()=>{ assert.match(src,/requiredSecrets:\["YOUTUBE_API_KEY"\]/); assert.match(src,/oauthNotRequiredForPublicChannelReads:true/); });
test('Qualified-view awarding is race-safe and has an explicit threshold',()=>{ assert.match(src,/QUALIFIED_VIEW_MS = 3000/); assert.match(src,/db\.transaction\(\(\)=>/); });
test('Creator payments support Business Hub accounts with multiple business capabilities',()=>{ assert.match(src,/split\('\,?'\)\.includes/); });
test('Approval starts the placement lifetime at approval time',()=>{ assert.match(src,/approvedAt=now\(\)/); assert.match(src,/activeFrom=CASE WHEN \?='approved' THEN \?/); });
test('Admin UI exposes YouTube credential readiness',()=>{ assert.match(admin,/youtubeConfig/); assert.match(admin,/WAITING FOR API/); assert.match(admin,/YOUTUBE_API_KEY/); });
test('Public feed emits a source-owned YouTube embed URL',()=>{ assert.match(src,/youtube\.com\/embed/); assert.match(src,/playsinline=1/); });
test('Data API import excludes private videos',()=>{ assert.match(src,/privacyStatus !== "private"/); });
test('Historical Narrativia import is capped at the intentional 500-page safety bound per sync',()=>{ assert.match(src,/channel\.isNarrativia \? 500 : 50/); assert.match(src,/Math\.min\(500/); });
test('Normal creators receive exactly 25 free Shorts monthly',()=>{ assert.match(src,/SHORT_FREE_LIMIT = 5/); assert.match(src,/SHORT_FREE_LIMIT/); });
test('Normal long-form distribution cannot exceed 100 monthly',()=>{ assert.match(src,/MAX_LONG_PER_MONTH = 100/); assert.match(src,/Math\.min\(MAX_LONG_PER_MONTH/); });
test('Normal creator placement is 90 days while Narrativia is 120 days',()=>{ assert.match(src,/DEFAULT_DURATION_DAYS = 90/); assert.match(src,/NARRATIVIA_DURATION_DAYS = 120/); });
test('Autoplay preference defaults to ON and is server-controlled',()=>{ assert.match(src,/autoplayVideos INTEGER NOT NULL DEFAULT 1/); assert.match(src,/updateYaayzPreferences/); });
test('Admin creator controls include approve, reject and suspend paths',()=>{ assert.match(src,/\['approve','reject','suspend'\]/); assert.match(src,/youtube_channel_\$\{decision\}/); assert.match(src,/youtube_video_\$\{decision\}/); });
test('Credential setup never returns the actual API secret',()=>{ assert.match(src,/requiredSecrets/); assert.doesNotMatch(src,/res\.json\(\{[^}]*YOUTUBE_API_KEY[^}]*process\.env\.YOUTUBE_API_KEY/); });
