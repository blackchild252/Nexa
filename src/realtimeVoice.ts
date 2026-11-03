export type RealtimeVoiceStatus = 'idle'|'connecting'|'connected'|'error';

type RTC = any;

export class NexaRealtimeVoice {
  pc: RTC|null = null;
  dc: RTC|null = null;
  stream: RTC|null = null;
  onStatus?: (status: RealtimeVoiceStatus, message?: string)=>void;
  onEvent?: (event:any)=>void;

  private setStatus(s:RealtimeVoiceStatus,m?:string){ this.onStatus?.(s,m); }

  async connect(){
    this.close();
    this.setStatus('error', 'Realtime voice is disabled in local-only mode.');
    throw new Error('Realtime voice is disabled in local-only mode; no external provider will be contacted.');
  }

  sendText(text:string){
    if(!this.dc || this.dc.readyState !== 'open') throw new Error('Realtime voice is not connected.');
    this.dc.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text}]}}));
    this.dc.send(JSON.stringify({type:'response.create'}));
  }

  close(){
    try { this.dc?.close(); } catch {}
    try { this.stream?.getTracks?.().forEach((t:any)=>t.stop()); } catch {}
    try { this.pc?.close(); } catch {}
    this.dc=null; this.stream=null; this.pc=null;
    this.setStatus('idle');
  }
}
