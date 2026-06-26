var V=Object.defineProperty;var G=Object.getOwnPropertyDescriptor;var Y=Object.getOwnPropertyNames;var Q=Object.prototype.hasOwnProperty;var X=($,e)=>{for(var t in e)V($,t,{get:e[t],enumerable:!0})},Z=($,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of Y(e))!Q.call($,s)&&s!==t&&V($,s,{get:()=>e[s],enumerable:!(n=G(e,s))||n.enumerable});return $};var tt=$=>Z(V({},"__esModule",{value:!0}),$);var et={};X(et,{default:()=>q});module.exports=tt(et);var U=require("obsidian");var b=require("obsidian"),z={apiKey:"",apiBaseUrl:"https://api.openai.com/v1",modelName:"gpt-4o",knowledgeBasePath:"\u77E5\u8BC6\u5E93",memoryFolder:"\u8BB0\u5FC6",skillFolderPath:"\u77E5\u8BC6\u5E93",theme:"dark-blue",temperature:.7,maxIterations:15,autoLog:!0,streamMode:!0},B=class extends b.PluginSettingTab{constructor(t,n){super(t,n);this.plugin=n;let s=(0,b.debounce)(async()=>{await this.plugin.saveSettings()},500,!0);this.debouncedSave=()=>{s()}}display(){let{containerEl:t}=this;t.empty(),new b.Setting(t).setName("LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B\u8BBE\u7F6E").setHeading(),new b.Setting(t).setName("API Key").setDesc("OpenAI \u517C\u5BB9 API \u5BC6\u94A5").addText(n=>{n.setPlaceholder("sk-...").setValue(this.plugin.settings.apiKey).onChange(async i=>{this.plugin.settings.apiKey=i,this.debouncedSave()});let s=n.inputEl;s.type="password"}),new b.Setting(t).setName("API Base URL").setDesc("OpenAI \u517C\u5BB9 API \u5730\u5740").addText(n=>n.setPlaceholder("https://api.openai.com/v1").setValue(this.plugin.settings.apiBaseUrl).onChange(async s=>{this.plugin.settings.apiBaseUrl=s,this.debouncedSave()})),new b.Setting(t).setName("\u6A21\u578B\u540D\u79F0").setDesc("\u4F7F\u7528\u7684\u6A21\u578B\uFF0C\u5982 gpt-4o\u3001deepseek-chat \u7B49").addText(n=>n.setPlaceholder("gpt-4o").setValue(this.plugin.settings.modelName).onChange(async s=>{this.plugin.settings.modelName=s,this.debouncedSave()})),new b.Setting(t).setName("\u77E5\u8BC6\u5E93\u8DEF\u5F84").setDesc("\u77E5\u8BC6\u5E93\u5728 Vault \u4E2D\u7684\u6839\u8DEF\u5F84").addText(n=>n.setPlaceholder("\u77E5\u8BC6\u5E93").setValue(this.plugin.settings.knowledgeBasePath).onChange(async s=>{this.plugin.settings.knowledgeBasePath=s,this.debouncedSave()})),new b.Setting(t).setName("Skill \u6587\u4EF6\u5939\u8DEF\u5F84").setDesc("\u5305\u542B SKILL.md \u548C references/ \u5B50\u6587\u4EF6\u5939\u7684\u76EE\u5F55\u8DEF\u5F84\uFF08\u4ECE vault \u6839\u76EE\u5F55\u5F00\u59CB\uFF09").addText(n=>n.setPlaceholder("\u77E5\u8BC6\u5E93").setValue(this.plugin.settings.skillFolderPath).onChange(async s=>{this.plugin.settings.skillFolderPath=s,this.debouncedSave()})),new b.Setting(t).setName("\u8BB0\u5FC6\u6587\u4EF6\u5939\u8DEF\u5F84").setDesc("Agent \u8BB0\u5FC6\u5B58\u50A8\u8DEF\u5F84").addText(n=>n.setPlaceholder("\u8BB0\u5FC6").setValue(this.plugin.settings.memoryFolder).onChange(async s=>{this.plugin.settings.memoryFolder=s,this.debouncedSave()})),new b.Setting(t).setName("\u4E3B\u9898").setDesc("\u754C\u9762\u4E3B\u9898\u98CE\u683C").addDropdown(n=>n.addOptions({"dark-blue":"\u6697\u591C\u84DD","warm-light":"\u6696\u767D","obsidian-red":"Obsidian \u7EA2",lavender:"\u85B0\u8863\u8349\u7D2B","forest-green":"\u58A8\u7EFF"}).setValue(this.plugin.settings.theme).onChange(async s=>{this.plugin.settings.theme=s,await this.plugin.saveSettings(),this.plugin.applyTheme()})),new b.Setting(t).setName("Temperature").setDesc("LLM \u751F\u6210\u6E29\u5EA6 (0-2)").addSlider(n=>n.setLimits(0,2,.1).setValue(this.plugin.settings.temperature).onChange(async s=>{this.plugin.settings.temperature=s,this.debouncedSave()})),new b.Setting(t).setName("\u6700\u5927\u8FED\u4EE3\u6B21\u6570").setDesc("Agent \u5DE5\u5177\u8C03\u7528\u6700\u5927\u8FED\u4EE3\u6B21\u6570").addSlider(n=>n.setLimits(1,30,1).setValue(this.plugin.settings.maxIterations).onChange(async s=>{this.plugin.settings.maxIterations=s,this.debouncedSave()})),new b.Setting(t).setName("\u6D41\u5F0F\u8F93\u51FA").setDesc("\u542F\u7528\u6D41\u5F0F\u8F93\u51FA\uFF08\u5B9E\u65F6\u663E\u793A\u56DE\u590D\uFF09").addToggle(n=>n.setValue(this.plugin.settings.streamMode).onChange(async s=>{this.plugin.settings.streamMode=s,await this.plugin.saveSettings()})),new b.Setting(t).setName("\u81EA\u52A8\u65E5\u5FD7").setDesc("\u5BF9\u8BDD\u5B8C\u6210\u540E\u81EA\u52A8\u8BB0\u5F55\u5DE5\u4F5C\u65E5\u5FD7").addToggle(n=>n.setValue(this.plugin.settings.autoLog).onChange(async s=>{this.plugin.settings.autoLog=s,await this.plugin.saveSettings()}))}};var K=require("obsidian");function H($,e,t,n=""){let s=[],i=`\u4F60\u662F\u4E00\u4E2A\u77E5\u8BC6\u5E93\u6784\u5EFA\u4E0E\u7EF4\u62A4\u52A9\u624B\u3002\u4F60\u7684\u5DE5\u4F5C\u89C4\u8303\u3001\u539F\u5219\u3001\u5DE5\u4F5C\u6D41\u3001\u8D28\u91CF\u63A7\u5236\u6807\u51C6\u3001\u9875\u9762\u6A21\u677F\u7B49\u5168\u90E8\u5B9A\u4E49\u5728\u4E0B\u65B9\u300C\u77E5\u8BC6\u5E93\u6784\u5EFA\u89C4\u8303\u300D\u4E2D\u3002

\u4F60\u5FC5\u987B\u4E25\u683C\u9075\u5B88\u4EE5\u4E0B\u89C4\u8303\u4E2D\u7684\u6BCF\u4E00\u6761\u89C4\u5219\uFF0C\u5305\u62EC\u4F46\u4E0D\u9650\u4E8E\uFF1A
- \u4E09\u5927\u94C1\u5F8B\uFF08\u539F\u59CB\u8D44\u6599\u53EA\u8BFB\u3001\u77E5\u8BC6\u70B9\u539F\u5B50\u5316\u3001\u51B2\u7A81\u4E0D\u5220\u9664\uFF09
- \u4E09\u4E0D\u4E09\u8981\u539F\u5219
- \u4E09\u5927\u5DE5\u4F5C\u6D41\uFF08Ingest / Query / Lint\uFF09\u7684\u6BCF\u4E2A\u6B65\u9AA4
- \u9875\u9762\u6A21\u677F\u7684\u6BCF\u4E2A\u7AE0\u8282
- \u81EA\u68C0\u6E05\u5355\u7684\u6BCF\u4E2A\u68C0\u67E5\u9879
- \u683C\u5F0F\u9677\u9631\u7684\u7981\u6B62\u4E8B\u9879

\u77E5\u8BC6\u5E93\u6839\u8DEF\u5F84\uFF1A${$.knowledgeBasePath}/
\u8BB0\u5FC6\u5B58\u50A8\u8DEF\u5F84\uFF1A${$.memoryFolder}/

# \u5DE5\u5177\u4F7F\u7528\u63D0\u793A

\u4EE5\u4E0B\u662F\u5E38\u7528\u5DE5\u5177\u53CA\u5176\u7528\u9014\uFF08\u5B8C\u6574\u5DE5\u5177\u5217\u8868\u7531\u7CFB\u7EDF\u63D0\u4F9B\uFF09\uFF1A

## \u6587\u4EF6\u64CD\u4F5C\u5DE5\u5177
- read_vault_file(path) \u2014 \u8BFB\u53D6 vault \u4E2D\u7684\u6587\u4EF6
- write_vault_file(path, content) \u2014 \u521B\u5EFA\u65B0\u6587\u4EF6\uFF08\u4E0D\u80FD\u5199\u5165 00-\u539F\u59CB\u8D44\u6599/\uFF0C\u5DF2\u5B58\u5728\u5219\u62A5\u9519\uFF09
- append_vault_file(path, content) \u2014 \u5728\u6587\u4EF6\u672B\u5C3E\u8FFD\u52A0\u5185\u5BB9\uFF08\u4E0D\u80FD\u4FEE\u6539 00-\u539F\u59CB\u8D44\u6599/\uFF09
- list_vault_folder(path) \u2014 \u5217\u51FA\u6587\u4EF6\u5939\u5185\u5BB9
- create_vault_folder(path) \u2014 \u521B\u5EFA\u6587\u4EF6\u5939
- search_vault_files(query) \u2014 \u641C\u7D22\u6587\u4EF6\u540D
- search_vault_content(query) \u2014 \u641C\u7D22\u6587\u4EF6\u5185\u5BB9

## \u77E5\u8BC6\u5E93\u6784\u5EFA\u5DE5\u5177
- read_skill(file) \u2014 \u968F\u65F6\u91CD\u65B0\u8BFB\u53D6 SKILL.md \u6216 references/ \u4E2D\u7684\u6A21\u677F
- init_knowledge_base(topic_name) \u2014 \u521D\u59CB\u5316\u77E5\u8BC6\u5E93\u76EE\u5F55\u7ED3\u6784
- ingest_raw_material(file_path) \u2014 \u8BFB\u53D6\u539F\u59CB\u8D44\u6599\u540E\uFF0C\u5FC5\u987B\u7528 create_and_index_page \u5B8C\u6210\u5168\u6D41\u7A0B
- create_and_index_page(page_type, title, content) \u2014 \u4E00\u7AD9\u5F0F\u521B\u5EFA\u9875\u9762 + \u66F4\u65B0\u7D22\u5F15 + \u8FFD\u52A0\u65E5\u5FD7
- create_knowledge_page(category, title, content) \u2014 \u521B\u5EFA\u77E5\u8BC6\u70B9\u9875\u9762\uFF08\u63A8\u8350\u7528 create_and_index_page\uFF09
- update_knowledge_page(path, section, content) \u2014 \u5728\u6307\u5B9A\u7AE0\u8282\u672B\u5C3E\u8FFD\u52A0\u5185\u5BB9\uFF08\u4E0D\u53EF\u66FF\u6362\u6216\u5220\u9664\uFF09
- update_index(action, entry_name, entry_category) \u2014 \u66F4\u65B0\u7D22\u5F15
- query_knowledge(query) \u2014 \u67E5\u8BE2\u77E5\u8BC6\u5E93
- lint_knowledge_base(check_type) \u2014 \u5BF9\u77E5\u8BC6\u5E93\u6267\u884C\u6574\u7406\u68C0\u67E5
- get_knowledge_base_status() \u2014 \u67E5\u770B\u77E5\u8BC6\u5E93\u6982\u51B5
- record_conflict(old_info, new_info) \u2014 \u8BB0\u5F55\u77DB\u76FE

## \u8BB0\u5FC6\u5DE5\u5177
- save_memory(category, content) \u2014 \u4FDD\u5B58\u957F\u671F\u8BB0\u5FC6
- save_preference(key, value) \u2014 \u4FDD\u5B58\u7528\u6237\u504F\u597D
- write_log(title, content) \u2014 \u5199\u5165\u5DE5\u4F5C\u65E5\u5FD7
- read_memory() \u2014 \u8BFB\u53D6\u957F\u671F\u8BB0\u5FC6\u548C\u504F\u597D

## \u91CD\u8981\u89C4\u5219
1. \u521B\u5EFA\u9875\u9762\u540E\u5FC5\u987B\u7528 create_and_index_page\uFF08\u4E00\u6B21\u5B8C\u6210\u521B\u5EFA+\u7D22\u5F15+\u65E5\u5FD7\uFF09\uFF0C\u4E0D\u8981\u5206\u5F00\u8C03\u7528
2. Ingest \u540E\u5FC5\u987B\u5B8C\u6210\uFF1A\u8BFB\u53D6\u2192\u521B\u5EFA\u9875\u9762\u2192\u7D22\u5F15\u66F4\u65B0\u2192\u65E5\u5FD7\u8FFD\u52A0\u2192\u5165\u94FE\u2192\u81EA\u68C0\u2192\u603B\u7ED3
3. \u66F4\u65B0\u9875\u9762\u540E\u5FC5\u987B\u8FFD\u52A0\u66F4\u65B0\u65E5\u5FD7
4. \u65B0\u5EFA\u9875\u9762\u540E\u5FC5\u987B\u5728 \u22653 \u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u6DFB\u52A0\u5165\u94FE
5. \u26D4 \u7EDD\u5BF9\u7981\u6B62\u5220\u9664\uFF1A\u4E0D\u5141\u8BB8\u4F7F\u7528\u4EFB\u4F55\u65B9\u5F0F\u5220\u9664\u6587\u4EF6\u6216\u64E6\u9664\u6587\u4EF6\u4E2D\u7684\u5DF2\u6709\u5185\u5BB9
6. \u26D4 \u7EDD\u5BF9\u7981\u6B62\u8986\u76D6\uFF1Awrite_vault_file \u548C\u6240\u6709\u9875\u9762\u521B\u5EFA\u5DE5\u5177\u90FD\u53EA\u80FD\u521B\u5EFA\u65B0\u6587\u4EF6\uFF0C\u6587\u4EF6\u5DF2\u5B58\u5728\u65F6\u5FC5\u987B\u62A5\u9519\u3002\u5DF2\u6709\u5185\u5BB9\u53EA\u80FD\u7528 append_vault_file \u6216 update_knowledge_page \u8FFD\u52A0
7. \u26D4 \u7981\u6B62\u79FB\u52A8/\u590D\u5236\u6587\u4EF6\uFF1A00-\u539F\u59CB\u8D44\u6599/ \u76EE\u5F55\u53EA\u8BFB\uFF0C\u4E0D\u5141\u8BB8\u5199\u5165/\u4FEE\u6539/\u8FFD\u52A0\u4EFB\u4F55\u5185\u5BB9\u3002\u5982\u679C\u7528\u6237\u8981\u6C42\u79FB\u52A8\u6587\u4EF6\uFF0C\u5FC5\u987B\u544A\u77E5\u7528\u6237\u624B\u52A8\u64CD\u4F5C\uFF0CAgent \u4E0D\u5F97\u5C1D\u8BD5
8. \u6BCF\u6B21\u5DE5\u4F5C\u6D41\u5B8C\u6210\u540E\uFF0C\u5FC5\u987B\u7528\u4E2D\u6587\u5411\u7528\u6237\u603B\u7ED3\u672C\u6B21\u5B8C\u6210\u4E86\u4EC0\u4E48\u3001\u521B\u5EFA\u4E86\u4EC0\u4E48\u3001\u66F4\u65B0\u4E86\u4EC0\u4E48`;return s.push(i),e.trim()&&s.push(`# \u{1F4D6} \u77E5\u8BC6\u5E93\u6784\u5EFA\u89C4\u8303\uFF08\u5B8C\u6574\u7248\uFF09

${e}`),t.trim()&&s.push(`

# \u{1F4CB} \u53C2\u8003\u6A21\u677F

${t}`),n.trim()&&s.push(`

# \u{1F9E0} \u6211\u7684\u8BB0\u5FC6\uFF08\u81EA\u52A8\u52A0\u8F7D\uFF09

${n}`),s.join(`

---

`)}var O=class{constructor(e,t){this.history=[];this.abortController=null;this.systemPrompt="";this.settings=e,this.toolRegistry=t}init(e="",t="",n=""){this.systemPrompt=H(this.settings,e,t,n),this.history=[]}setHistory(e){this.history=e}getHistory(){return this.history}clearHistory(){this.history=[]}updateSettings(e){this.settings=e,this.toolRegistry.updateSettings(e)}abort(){this.abortController&&(this.abortController.abort(),this.abortController=null)}async chatStream(e,t){this.history.push({role:"user",content:e});let n="",s=0,i=this.settings.maxIterations||15;for(;s<i;){s++;let c=[{role:"system",content:this.systemPrompt},...this.history];try{let l=await this.streamCompletion(c,t);if(n=l.content,l.toolCalls.length===0){this.history.push({role:"assistant",content:l.content}),t.onComplete(n);return}this.history.push({role:"assistant",content:l.content||"",tool_calls:l.toolCalls});for(let u of l.toolCalls){let d={};try{d=JSON.parse(u.function.arguments)}catch(r){d={}}t.onToolCall(u.function.name,d);let m=await this.toolRegistry.executeTool(u.function.name,d);t.onToolResult(u.function.name,m),this.history.push({role:"tool",content:m.content,tool_call_id:u.id,name:u.function.name})}}catch(l){if(l instanceof Error&&l.name==="AbortError"){t.onComplete(n);return}let u=`\u8BF7\u6C42\u5931\u8D25: ${l instanceof Error?l.message:String(l)}`;this.history.push({role:"assistant",content:u}),t.onError(u);return}}let o=`\u5DF2\u8FBE\u5230\u6700\u5927\u8FED\u4EE3\u6B21\u6570(${i})\uFF0C\u8BF7\u7B80\u5316\u95EE\u9898\u6216\u5206\u6B65\u6267\u884C\u3002`;this.history.push({role:"assistant",content:o}),t.onComplete(o)}async streamCompletion(e,t){var r,p,h,f,y,g,_;let n=`${this.settings.apiBaseUrl}/chat/completions`,s={model:this.settings.modelName,messages:e.map(w=>({role:w.role,content:w.content||null,tool_calls:w.tool_calls,tool_call_id:w.tool_call_id,name:w.name})),tools:this.toolRegistry.getToolDefinitions(),tool_choice:"auto",temperature:this.settings.temperature,stream:!0};this.abortController=new AbortController;let i=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.settings.apiKey}`},body:JSON.stringify(s),signal:(r=this.abortController)==null?void 0:r.signal});if(!i.ok){let w=await i.text().catch(()=>"\u672A\u77E5\u9519\u8BEF");throw new Error(`API \u8BF7\u6C42\u5931\u8D25: ${i.status} ${w}`)}let o=(p=i.body)==null?void 0:p.getReader();if(!o)throw new Error("\u65E0\u6CD5\u83B7\u53D6\u54CD\u5E94\u6D41");let c=new TextDecoder,l="",u="",d=new Map;for(;;){let{done:w,value:v}=await o.read();if(w)break;l+=c.decode(v,{stream:!0});let k=l.split(`
`);l=k.pop()||"";for(let x of k){let L=x.trim();if(!(!L||L==="data: [DONE]")&&L.startsWith("data: "))try{let S=(f=(h=JSON.parse(L.slice(6)).choices)==null?void 0:h[0])==null?void 0:f.delta;if(!S)continue;if(S.content&&(u+=S.content,t.onToken(S.content)),S.tool_calls)for(let T of S.tool_calls){let E=(y=T.index)!=null?y:0;d.has(E)||d.set(E,{id:"",type:"function",function:{name:"",arguments:""}});let A=d.get(E);T.id&&(A.id+=T.id),(g=T.function)!=null&&g.name&&(A.function.name+=T.function.name),(_=T.function)!=null&&_.arguments&&(A.function.arguments+=T.function.arguments)}}catch(F){continue}}}let m=Array.from(d.values()).filter(w=>w.id);return this.abortController=null,{content:u,toolCalls:m}}async chatNonStream(e,t){this.history.push({role:"user",content:e});let n="",s=0,i=this.settings.maxIterations||15;for(;s<i;){s++;let c=[{role:"system",content:this.systemPrompt},...this.history];try{let l=await this.nonStreamCompletion(c),u=l.content;if(l.toolCalls.length===0){t.onToken(u),this.history.push({role:"assistant",content:u}),n=u,t.onComplete(n);return}this.history.push({role:"assistant",content:u||"",tool_calls:l.toolCalls});for(let d of l.toolCalls){let m={};try{m=JSON.parse(d.function.arguments)}catch(p){m={}}t.onToolCall(d.function.name,m);let r=await this.toolRegistry.executeTool(d.function.name,m);t.onToolResult(d.function.name,r),this.history.push({role:"tool",content:r.content,tool_call_id:d.id,name:d.function.name})}}catch(l){let u=`\u8BF7\u6C42\u5931\u8D25: ${l.message}`;this.history.push({role:"assistant",content:u}),t.onError(u);return}}let o=`\u5DF2\u8FBE\u5230\u6700\u5927\u8FED\u4EE3\u6B21\u6570(${i})`;this.history.push({role:"assistant",content:o}),t.onComplete(o)}async nonStreamCompletion(e){var i;let t=`${this.settings.apiBaseUrl}/chat/completions`,n={model:this.settings.modelName,messages:e.map(o=>({role:o.role,content:o.content||null,tool_calls:o.tool_calls,tool_call_id:o.tool_call_id,name:o.name})),tools:this.toolRegistry.getToolDefinitions(),tool_choice:"auto",temperature:this.settings.temperature,stream:!1},s=2;for(let o=0;o<=s;o++)try{let l=(i=(await(0,K.requestUrl)({url:t,method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.settings.apiKey}`},body:JSON.stringify(n)})).json.choices)==null?void 0:i[0];if(!l)throw new Error("API \u8FD4\u56DE\u4E3A\u7A7A");let u=l.message||{};return{content:u.content||"",toolCalls:u.tool_calls||[]}}catch(c){let l=(c==null?void 0:c.status)||0;if(l>=400&&l<500)throw c;if(o<s)await new Promise(u=>window.setTimeout(u,1e3*(o+1)));else throw c}throw new Error("API \u8C03\u7528\u5931\u8D25\uFF08\u5DF2\u91CD\u8BD5\uFF09")}};var a=require("obsidian"),I=class{constructor(e,t){this.tools=new Map;this.app=e,this.settings=t,this.registerAllTools()}updateSettings(e){this.settings=e}registerAllTools(){this.registerVaultTools(),this.registerSkillTools(),this.registerMemoryTools()}registerVaultTools(){this.tools.set("read_vault_file",{name:"read_vault_file",description:"\u8BFB\u53D6 Vault \u4E2D\u7684\u6587\u4EF6\u5185\u5BB9",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84"}},required:["path"]},execute:async e=>{try{let t=(0,a.normalizePath)(e.path),n=this.app.vault.getAbstractFileByPath(t);return!n||!(n instanceof a.TFile)?{success:!1,content:`\u6587\u4EF6\u4E0D\u5B58\u5728: ${t}`}:{success:!0,content:await this.app.vault.read(n)}}catch(t){return{success:!1,content:`\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25: ${t.message}`}}}}),this.tools.set("write_vault_file",{name:"write_vault_file",description:"\u521B\u5EFA\u65B0\u6587\u4EF6\uFF08\u4E0D\u80FD\u5199\u5165 00-\u539F\u59CB\u8D44\u6599/ \u76EE\u5F55\u3002\u5982\u679C\u6587\u4EF6\u5DF2\u5B58\u5728\u5219\u62A5\u9519\uFF09",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84\uFF08\u5FC5\u987B\u662F\u4E0D\u5B58\u5728\u7684\u8DEF\u5F84\uFF0C\u4E14\u4E0D\u80FD\u5728 00-\u539F\u59CB\u8D44\u6599/ \u4E0B\uFF09"},content:{type:"string",description:"\u6587\u4EF6\u5185\u5BB9"}},required:["path","content"]},execute:async e=>{try{let t=(0,a.normalizePath)(e.path),n=this.isUnderRawMaterials(t);if(n)return{success:!1,content:`\u7981\u6B62\u5199\u5165\u539F\u59CB\u8D44\u6599\u76EE\u5F55\uFF1A${n}\u300200-\u539F\u59CB\u8D44\u6599/ \u76EE\u5F55\u53EA\u8BFB\uFF0C\u4E0D\u80FD\u4FEE\u6539\u3002\u5982\u679C\u7528\u6237\u9700\u8981\u79FB\u52A8\u6587\u4EF6\uFF0C\u8BF7\u544A\u77E5\u7528\u6237\u624B\u52A8\u64CD\u4F5C\u3002`};let s=this.app.vault.getAbstractFileByPath(t);return s&&s instanceof a.TFile?{success:!1,content:`\u6587\u4EF6\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${t}\u3002\u8BF7\u4F7F\u7528 append_vault_file \u8FFD\u52A0\u5185\u5BB9\uFF0C\u6216\u4F7F\u7528 update_knowledge_page \u66F4\u65B0\u9875\u9762\u7AE0\u8282\u3002`}:(await this.ensureFolder(t.substring(0,t.lastIndexOf("/"))),await this.app.vault.create(t,e.content),{success:!0,content:`\u6587\u4EF6\u5DF2\u521B\u5EFA: ${t}`})}catch(t){return{success:!1,content:`\u521B\u5EFA\u6587\u4EF6\u5931\u8D25: ${t.message}`}}}}),this.tools.set("append_vault_file",{name:"append_vault_file",description:"\u5728 Vault \u6587\u4EF6\u672B\u5C3E\u8FFD\u52A0\u5185\u5BB9\uFF08\u4E0D\u80FD\u4FEE\u6539 00-\u539F\u59CB\u8D44\u6599/ \u76EE\u5F55\u4E0B\u7684\u6587\u4EF6\uFF09",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84"},content:{type:"string",description:"\u8981\u8FFD\u52A0\u7684\u5185\u5BB9"}},required:["path","content"]},execute:async e=>{try{let t=(0,a.normalizePath)(e.path),n=this.isUnderRawMaterials(t);if(n)return{success:!1,content:`\u7981\u6B62\u4FEE\u6539\u539F\u59CB\u8D44\u6599\u76EE\u5F55\uFF1A${n}\u300200-\u539F\u59CB\u8D44\u6599/ \u76EE\u5F55\u53EA\u8BFB\u3002`};let s=this.app.vault.getAbstractFileByPath(t);if(!s||!(s instanceof a.TFile))return{success:!1,content:`\u6587\u4EF6\u4E0D\u5B58\u5728: ${t}`};let i=await this.app.vault.read(s);return await this.app.vault.modify(s,i+`
`+e.content),{success:!0,content:`\u5185\u5BB9\u5DF2\u8FFD\u52A0\u5230: ${t}`}}catch(t){return{success:!1,content:`\u8FFD\u52A0\u5185\u5BB9\u5931\u8D25: ${t.message}`}}}}),this.tools.set("list_vault_folder",{name:"list_vault_folder",description:"\u5217\u51FA Vault \u6587\u4EF6\u5939\u4E2D\u7684\u6240\u6709\u6587\u4EF6\u548C\u5B50\u6587\u4EF6\u5939",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5939\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84"}},required:["path"]},execute:async e=>{try{let t=(0,a.normalizePath)(e.path),n=this.app.vault.getAbstractFileByPath(t);if(!n||!(n instanceof a.TFolder))return{success:!1,content:`\u6587\u4EF6\u5939\u4E0D\u5B58\u5728: ${t}`};let s=[];for(let i of n.children)i instanceof a.TFile?s.push(`\u{1F4C4} ${i.path} (${i.stat.size} bytes)`):i instanceof a.TFolder&&s.push(`\u{1F4C1} ${i.path}/`);return{success:!0,content:s.length>0?s.join(`
`):"\u6587\u4EF6\u5939\u4E3A\u7A7A"}}catch(t){return{success:!1,content:`\u5217\u51FA\u6587\u4EF6\u5939\u5931\u8D25: ${t.message}`}}}}),this.tools.set("create_vault_folder",{name:"create_vault_folder",description:"\u5728 Vault \u4E2D\u521B\u5EFA\u6587\u4EF6\u5939\uFF08\u652F\u6301\u9012\u5F52\u521B\u5EFA\uFF09",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5939\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84"}},required:["path"]},execute:async e=>{try{let t=(0,a.normalizePath)(e.path);return await this.ensureFolder(t),{success:!0,content:`\u6587\u4EF6\u5939\u5DF2\u521B\u5EFA: ${t}`}}catch(t){return{success:!1,content:`\u521B\u5EFA\u6587\u4EF6\u5939\u5931\u8D25: ${t.message}`}}}}),this.tools.set("search_vault_files",{name:"search_vault_files",description:"\u5728 Vault \u4E2D\u641C\u7D22\u6587\u4EF6\u540D\u5305\u542B\u5173\u952E\u8BCD\u7684\u6587\u4EF6",parameters:{type:"object",properties:{query:{type:"string",description:"\u641C\u7D22\u5173\u952E\u8BCD"},folder:{type:"string",description:"\u9650\u5B9A\u641C\u7D22\u7684\u6587\u4EF6\u5939\u8DEF\u5F84\uFF08\u53EF\u9009\uFF09"}},required:["query"]},execute:async e=>{try{let t=e.query.toLowerCase(),s=this.app.vault.getFiles().filter(o=>o.path.toLowerCase().includes(t));if(e.folder){let o=(0,a.normalizePath)(e.folder).toLowerCase();s=s.filter(c=>c.path.toLowerCase().startsWith(o))}let i=s.slice(0,50).map(o=>`\u{1F4C4} ${o.path}`);return{success:!0,content:i.length>0?`\u627E\u5230 ${s.length} \u4E2A\u6587\u4EF6:
${i.join(`
`)}`:"\u672A\u627E\u5230\u5339\u914D\u6587\u4EF6"}}catch(t){return{success:!1,content:`\u641C\u7D22\u5931\u8D25: ${t.message}`}}}}),this.tools.set("search_vault_content",{name:"search_vault_content",description:"\u5728 Vault \u6587\u4EF6\u5185\u5BB9\u4E2D\u641C\u7D22\u5305\u542B\u5173\u952E\u8BCD\u7684\u6587\u4EF6",parameters:{type:"object",properties:{query:{type:"string",description:"\u641C\u7D22\u5185\u5BB9\u5173\u952E\u8BCD"},folder:{type:"string",description:"\u9650\u5B9A\u641C\u7D22\u7684\u6587\u4EF6\u5939\u8DEF\u5F84\uFF08\u53EF\u9009\uFF09"}},required:["query"]},execute:async e=>{try{let t=e.query.toLowerCase(),n=this.app.vault.getMarkdownFiles();if(e.folder){let i=(0,a.normalizePath)(e.folder).toLowerCase();n=n.filter(o=>o.path.toLowerCase().startsWith(i))}let s=[];for(let i of n.slice(0,100))(await this.app.vault.cachedRead(i)).toLowerCase().includes(t)&&s.push(`\u{1F4C4} ${i.path}`);return{success:!0,content:s.length>0?`\u627E\u5230 ${s.length} \u4E2A\u6587\u4EF6:
${s.join(`
`)}`:"\u672A\u627E\u5230\u5339\u914D\u5185\u5BB9"}}catch(t){return{success:!1,content:`\u641C\u7D22\u5931\u8D25: ${t.message}`}}}})}registerSkillTools(){this.tools.set("read_skill",{name:"read_skill",description:"\u8BFB\u53D6 SKILL.md \u6587\u4EF6\u6216 references/ \u4E2D\u7684\u53C2\u8003\u6A21\u677F\u6587\u4EF6\u3002\u7528\u4E8E\u968F\u65F6\u67E5\u9605\u77E5\u8BC6\u5E93\u6784\u5EFA\u89C4\u8303\u539F\u6587",parameters:{type:"object",properties:{file:{type:"string",description:"\u8981\u8BFB\u53D6\u7684\u6587\u4EF6\u540D\u3002\u53EF\u9009\u503C\uFF1ASKILL.md\uFF08\u4E3B\u89C4\u8303\uFF09\u3001\u77E5\u8BC6\u70B9\u9875\u9762\u6A21\u677F.md\u3001\u4EBA\u7269\u4F20\u8BB0\u6A21\u677F.md\u3001\u7EC4\u7EC7\u6863\u6848\u6A21\u677F.md\u3001\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15\u6A21\u677F.md\u3001\u66F4\u65B0\u65E5\u5FD7\u6A21\u677F.md\u3001AGENTS-template.md\u3001\u51B2\u7A81\u8BB0\u5F55\u6A21\u677F.md"}},required:["file"]},execute:async e=>{try{let t=(0,a.normalizePath)(this.settings.skillFolderPath),n=`${t}/references`,s;e.file==="SKILL.md"?s=`${t}/SKILL.md`:s=`${n}/${e.file}`;let i=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(s));return!i||!(i instanceof a.TFile)?{success:!1,content:`\u6587\u4EF6\u4E0D\u5B58\u5728: ${s}\u3002Skill \u6587\u4EF6\u5939\u8DEF\u5F84: ${this.settings.skillFolderPath}`}:{success:!0,content:await this.app.vault.read(i)}}catch(t){return{success:!1,content:`\u8BFB\u53D6\u5931\u8D25: ${t.message}`}}}}),this.tools.set("init_knowledge_base",{name:"init_knowledge_base",description:"\u521D\u59CB\u5316\u4E13\u9898\u77E5\u8BC6\u5E93\u76EE\u5F55\u7ED3\u6784\uFF0C\u521B\u5EFA\u6240\u6709\u5FC5\u9700\u7684\u6587\u4EF6\u5939\u548C\u521D\u59CB\u7D22\u5F15\u6587\u4EF6",parameters:{type:"object",properties:{topic_name:{type:"string",description:"\u4E13\u9898\u540D\u79F0\uFF0C\u5982'\u5DF4\u83F2\u7279\u6295\u8D44'\u3001'Python\u7F16\u7A0B'"},categories:{type:"string",description:"\u77E5\u8BC6\u70B9\u5E93\u5206\u7C7B\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u5982'\u6838\u5FC3\u6982\u5FF5,\u65B9\u6CD5\u8BBA,\u7ECF\u5178\u6848\u4F8B,\u4EBA\u7269\u4F20\u8BB0,\u7EC4\u7EC7\u6863\u6848,\u884C\u4E1A\u5206\u6790'"},raw_categories:{type:"string",description:"\u539F\u59CB\u8D44\u6599\u5206\u7C7B\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u5982'\u81F4\u80A1\u4E1C\u4FE1,\u80A1\u4E1C\u5927\u4F1A\u6F14\u8BB2'"}},required:["topic_name"]},execute:async e=>{try{let t=(0,a.normalizePath)(this.settings.knowledgeBasePath),n=(e.categories||"\u6838\u5FC3\u6982\u5FF5,\u65B9\u6CD5\u8BBA,\u7ECF\u5178\u6848\u4F8B,\u4EBA\u7269\u4F20\u8BB0,\u7EC4\u7EC7\u6863\u6848,\u884C\u4E1A\u5206\u6790").split(","),s=(e.raw_categories||"\u8D44\u6599\u5206\u7C7B1,\u8D44\u6599\u5206\u7C7B2").split(","),i=[t,`${t}/00-\u539F\u59CB\u8D44\u6599`,`${t}/00-\u539F\u59CB\u8D44\u6599/assets`,`${t}/10-\u77E5\u8BC6\u70B9\u5E93`,`${t}/20-\u77E5\u8BC6\u7D22\u5F15`,`${t}/30-\u7EF4\u62A4\u8BB0\u5F55`];for(let r of s)i.push(`${t}/00-\u539F\u59CB\u8D44\u6599/${r.trim()}`);for(let r of n)i.push(`${t}/10-\u77E5\u8BC6\u70B9\u5E93/${r.trim()}`);for(let r of i)await this.ensureFolder(r);let o=`# ${e.topic_name}\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15

## \u4E00\u3001\u77E5\u8BC6\u70B9\u5206\u7C7B\u7D22\u5F15

${n.map((r,p)=>`### ${p+1}. ${r.trim()}\uFF080\u4E2A\uFF09\u{1F534}

\uFF08\u6682\u65E0\u77E5\u8BC6\u70B9\uFF09`).join(`

`)}

---

## \u4E8C\u3001\u4EBA\u7269\u4F20\u8BB0\u7D22\u5F15\uFF080\u4F4D\uFF09

\uFF08\u6682\u65E0\uFF09

---

## \u4E09\u3001\u7EC4\u7EC7\u6863\u6848\u7D22\u5F15\uFF080\u5BB6\uFF09

\uFF08\u6682\u65E0\uFF09

---

## \u56DB\u3001\u539F\u59CB\u8D44\u6599\u7EDF\u8BA1

| \u6765\u6E90 | \u6570\u91CF | \u72B6\u6001 |
|------|------|------|
${s.map(r=>`| ${r.trim()} | 0\u4EFD | \u{1F7E1} \u6536\u96C6\u4E2D |`).join(`
`)}

---

## \u4E94\u3001\u7EDF\u8BA1\u4FE1\u606F

- \u77E5\u8BC6\u70B9\u603B\u6570\uFF1A0\u4E2A
- \u4EBA\u7269\u4F20\u8BB0\uFF1A0\u4F4D
- \u7EC4\u7EC7\u6863\u6848\uFF1A0\u5BB6
- \u539F\u59CB\u8D44\u6599\uFF1A0\u4EFD
- \u5173\u952E\u8BCD\uFF1A0\u4E2A

---

## \u516D\u3001\u6210\u719F\u5EA6\u5206\u5E03

| \u7EA7\u522B | \u6570\u91CF | \u5360\u6BD4 | \u4E0B\u4E00\u6B65 |
|------|------|------|--------|
| \u{1F7E2} \u5B8C\u6574\u7EA7 | 0\u4E2A | 0% | \u7EF4\u62A4 |
| \u{1F7E1} \u57FA\u7840\u7EA7 | 0\u4E2A | 0% | \u5B8C\u5584 |
| \u{1F534} \u6846\u67B6\u7EA7 | 0\u4E2A | 0% | \u4F18\u5148\u8865\u5145 |
`;await this.createFileOnly(`${t}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,o);let c=`# ${e.topic_name}\u5173\u952E\u8BCD\u7D22\u5F15

| \u5173\u952E\u8BCD | \u76F8\u5173\u77E5\u8BC6\u70B9 | \u51FA\u73B0\u6B21\u6570 |
|--------|-----------|----------|

\uFF08\u6682\u65E0\u5173\u952E\u8BCD\uFF09
`;await this.createFileOnly(`${t}/20-\u77E5\u8BC6\u7D22\u5F15/\u5173\u952E\u8BCD\u7D22\u5F15.md`,c);let l=`# ${e.topic_name}\u77E5\u8BC6\u70B9\u5173\u7CFB\u56FE\u8C31

## \u77E5\u8BC6\u70B9\u5173\u7CFB

\`\`\`mermaid
graph LR
    start[\u77E5\u8BC6\u5E93] --> \u5F85\u8865\u5145
\`\`\`

## \u5173\u7CFB\u8BF4\u660E

\uFF08\u6682\u65E0\u5173\u7CFB\u6570\u636E\uFF09
`;await this.createFileOnly(`${t}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u70B9\u5173\u7CFB\u56FE\u8C31.md`,l);let u=`# \u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7

## ${new Date().toISOString().split("T")[0]} | \u77E5\u8BC6\u5E93\u521D\u59CB\u5316

**\u64CD\u4F5C\u4EBA\uFF1A** \u77E5\u8BC6\u5E93\u7EF4\u62A4\u8005
**\u53D8\u66F4\u7C7B\u578B\uFF1A** \u65B0\u5EFA
**\u89E6\u53D1\u6765\u6E90\uFF1A** \u7528\u6237\u6307\u4EE4

### \u53D8\u66F4\u5185\u5BB9

\u521D\u59CB\u5316 ${e.topic_name} \u77E5\u8BC6\u5E93\uFF0C\u521B\u5EFA\u76EE\u5F55\u7ED3\u6784\u548C\u521D\u59CB\u7D22\u5F15\u6587\u4EF6\u3002

### \u65B0\u5EFA\u9875\u9762

- 20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md
- 20-\u77E5\u8BC6\u7D22\u5F15/\u5173\u952E\u8BCD\u7D22\u5F15.md
- 20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u70B9\u5173\u7CFB\u56FE\u8C31.md
- 30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md

---
`;await this.createFileOnly(`${t}/30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md`,u);let d=`# \u51B2\u7A81\u4E0E\u9519\u8BEF\u8BB0\u5F55

\uFF08\u6682\u65E0\u51B2\u7A81\u8BB0\u5F55\uFF09
`;await this.createFileOnly(`${t}/30-\u7EF4\u62A4\u8BB0\u5F55/\u51B2\u7A81\u4E0E\u9519\u8BEF\u8BB0\u5F55.md`,d);let m=`# AGENTS.md \u2014 ${e.topic_name}\u77E5\u8BC6\u5E93\u7EF4\u62A4\u89C4\u5219

> \u57FA\u4E8E Karpathy LLM Wiki \u65B9\u6CD5\u8BBA

## \u76EE\u5F55\u7ED3\u6784

\`\`\`
${e.topic_name}/
\u251C\u2500\u2500 00-\u539F\u59CB\u8D44\u6599/
\u251C\u2500\u2500 10-\u77E5\u8BC6\u70B9\u5E93/
\u251C\u2500\u2500 20-\u77E5\u8BC6\u7D22\u5F15/
\u251C\u2500\u2500 30-\u7EF4\u62A4\u8BB0\u5F55/
\u2514\u2500\u2500 AGENTS.md
\`\`\`
`;try{let r=(0,a.normalizePath)(`${this.settings.skillFolderPath}/references/AGENTS-template.md`),p=this.app.vault.getAbstractFileByPath(r);p&&p instanceof a.TFile&&(m=(await this.app.vault.read(p)).replace(/\[专题名称\]/g,e.topic_name).replace(/\[专题名称\]/g,e.topic_name).replace(/YYYY-MM-DD/g,new Date().toISOString().split("T")[0]).replace(/\[方括号\]/g,""))}catch(r){}return await this.createFileOnly(`${t}/AGENTS.md`,m),{success:!0,content:`\u77E5\u8BC6\u5E93 "${e.topic_name}" \u5DF2\u521D\u59CB\u5316\u5B8C\u6210\uFF01

\u521B\u5EFA\u7684\u76EE\u5F55\uFF1A
- 00-\u539F\u59CB\u8D44\u6599/\uFF08\u542B ${s.length} \u4E2A\u5206\u7C7B\uFF09
- 10-\u77E5\u8BC6\u70B9\u5E93/\uFF08\u542B ${n.length} \u4E2A\u5206\u7C7B\uFF09
- 20-\u77E5\u8BC6\u7D22\u5F15/
- 30-\u7EF4\u62A4\u8BB0\u5F55/

\u521B\u5EFA\u7684\u6587\u4EF6\uFF1A
- \u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md
- \u5173\u952E\u8BCD\u7D22\u5F15.md
- \u77E5\u8BC6\u70B9\u5173\u7CFB\u56FE\u8C31.md
- \u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md
- \u51B2\u7A81\u4E0E\u9519\u8BEF\u8BB0\u5F55.md
- AGENTS.md

\u73B0\u5728\u53EF\u4EE5\u5F00\u59CB\u653E\u5165\u539F\u59CB\u8D44\u6599\u5E76\u6267\u884C\u6444\u53D6\u5DE5\u4F5C\u6D41\u4E86\uFF01`}}catch(t){return{success:!1,content:`\u521D\u59CB\u5316\u77E5\u8BC6\u5E93\u5931\u8D25: ${t.message}`}}}}),this.tools.set("ingest_raw_material",{name:"ingest_raw_material",description:"\u6444\u53D6\u539F\u59CB\u8D44\u6599\uFF1A\u8BFB\u53D6\u539F\u59CB\u8D44\u6599\u6587\u4EF6\uFF0C\u8FD4\u56DE\u5B8C\u6574\u5185\u5BB9\u4F9BLLM\u63D0\u70BC\u77E5\u8BC6\u70B9\u3002\u8BFB\u53D6\u540ELLM\u5FC5\u987B\u6267\u884C\u5B8C\u6574\u5DE5\u4F5C\u6D41\uFF1A\u63D0\u70BC\u2192\u521B\u5EFA\u9875\u9762\u2192\u66F4\u65B0\u7D22\u5F15\u2192\u8FFD\u52A0\u65E5\u5FD7\u3002\u8BF7\u4F7F\u7528 create_and_index_page \u4E00\u7AD9\u5F0F\u5B8C\u6210",parameters:{type:"object",properties:{file_path:{type:"string",description:"\u539F\u59CB\u8D44\u6599\u6587\u4EF6\u8DEF\u5F84\uFF08\u5FC5\u987B\u662F\u4EE5 00-\u539F\u59CB\u8D44\u6599/ \u5F00\u5934\u7684\u8DEF\u5F84\uFF09"},focus_topics:{type:"string",description:"\u91CD\u70B9\u5173\u6CE8\u7684\u77E5\u8BC6\u70B9\u4E3B\u9898\uFF0C\u9017\u53F7\u5206\u9694\uFF08\u53EF\u9009\uFF09"}},required:["file_path"]},execute:async e=>{try{let t=(0,a.normalizePath)(e.file_path),n=this.app.vault.getAbstractFileByPath(t);if(!n||!(n instanceof a.TFile))return{success:!1,content:`\u539F\u59CB\u8D44\u6599\u6587\u4EF6\u4E0D\u5B58\u5728: ${t}`};let s=await this.app.vault.read(n),i=s.length>8e3?s.substring(0,8e3)+`

...\uFF08\u4EE5\u4E0B\u5185\u5BB9\u7701\u7565\uFF0C\u5171`+s.length+"\u5B57\uFF09":s,o=e.focus_topics?`\u91CD\u70B9\u5173\u6CE8\u77E5\u8BC6\u70B9\uFF1A${e.focus_topics}`:"\u8BF7\u81EA\u884C\u5224\u65AD\u539F\u59CB\u8D44\u6599\u4E2D\u6709\u54EA\u4E9B\u503C\u5F97\u63D0\u70BC\u7684\u77E5\u8BC6\u70B9";return{success:!0,content:`\u{1F4C4} \u5DF2\u8BFB\u53D6\u539F\u59CB\u8D44\u6599: ${t}\uFF08\u5171${s.length}\u5B57\uFF09

---
\u5185\u5BB9\u9884\u89C8:
${i}

---

## \u26A0\uFE0F \u63A5\u4E0B\u6765\u4F60\u5FC5\u987B\u6309\u4EE5\u4E0B\u5DE5\u4F5C\u6D41\u6267\u884C\uFF0C\u4E0D\u80FD\u8DF3\u8FC7\u4EFB\u4F55\u6B65\u9AA4\uFF01

### \u5FC5\u987B\u5B8C\u6210\u7684\u6807\u51C6\u5DE5\u4F5C\u6D41\uFF1A

**Step 1 \u2014 \u63D0\u70BC\u77E5\u8BC6\u70B9\uFF08\u4F60\u73B0\u5728\u7684\u4F4D\u7F6E\uFF09**
${o}

**Step 2 \u2014 \u4E00\u7AD9\u5F0F\u521B\u5EFA\u9875\u9762+\u7D22\u5F15+\u65E5\u5FD7**
- \u8C03\u7528 create_and_index_page \u5DE5\u5177\uFF0C\u4F20\u5165 page_type\u3001title\u3001content\uFF08\u5B8C\u65749\u7AE0markdown\uFF09\u3001entry_category\u3001keywords
- \u4E0D\u8981\u624B\u52A8\u62C6\u5206\u591A\u4E2A\u6B65\u9AA4\uFF0C\u7528\u8FD9\u4E00\u4E2A\u5DE5\u5177\u5B8C\u6210\u6240\u6709\u64CD\u4F5C

**Step 3 \u2014 \u94FE\u63A5\u4E0E\u5165\u94FE**
- \u65B0\u9875\u9762\u521B\u5EFA\u540E\uFF0C\u5FC5\u987B\u5728\u81F3\u5C113\u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u4F7F\u7528 append_vault_file \u6DFB\u52A0\u5165\u94FE\uFF08\u6DFB\u52A0 [[\u77E5\u8BC6\u70B9\u540D\u79F0]] \u5230\u76F8\u5173\u9875\u9762\u7684\u300C\u76F8\u5173\u77E5\u8BC6\u70B9\u300D\u7AE0\u8282\uFF09

**Step 4 \u2014 \u6267\u884C\u81EA\u68C0\u6E05\u5355**
- \u7D22\u5F15\u6570\u91CF\u662F\u5426\u540C\u6B65\uFF1F
- \u65B0\u9875\u9762\u662F\u5426\u6709 \u22653 \u4E2A\u5165\u94FE\uFF1F
- \u66F4\u65B0\u65E5\u5FD7\u662F\u5426\u5DF2\u8FFD\u52A0\uFF1F\uFF08\u5DF2\u7531 create_and_index_page \u81EA\u52A8\u5B8C\u6210\uFF09

**Step 5 \u2014 \u603B\u7ED3\uFF08\u6700\u540E\u4E00\u6B65\uFF0C\u5FC5\u987B\u6267\u884C\uFF09**
\u5DE5\u4F5C\u6D41\u5168\u90E8\u5B8C\u6210\u540E\uFF0C\u5FC5\u987B\u7528\u4E2D\u6587\u5411\u7528\u6237\u5B8C\u6574\u603B\u7ED3\uFF1A
- \u8BFB\u53D6\u4E86\u54EA\u4E2A\u539F\u59CB\u8D44\u6599
- \u521B\u5EFA/\u66F4\u65B0\u4E86\u54EA\u4E9B\u77E5\u8BC6\u70B9\u9875\u9762
- \u66F4\u65B0\u4E86\u54EA\u4E9B\u7D22\u5F15
- \u5F53\u524D\u77E5\u8BC6\u5E93\u6982\u51B5\uFF08\u6587\u4EF6\u6570\u3001\u6210\u719F\u5EA6\uFF09`}}catch(t){return{success:!1,content:`\u6444\u53D6\u8D44\u6599\u5931\u8D25: ${t.message}`}}}}),this.tools.set("create_knowledge_page",{name:"create_knowledge_page",description:"\u521B\u5EFA\u77E5\u8BC6\u70B9\u9875\u9762\u3002\u63A8\u8350\u4F18\u5148\u4F7F\u7528 create_and_index_page \u4E00\u7AD9\u5F0F\u521B\u5EFA+\u7D22\u5F15+\u65E5\u5FD7\u3002\u63A8\u8350\u53EA\u4F20 title + category + content(\u5B8C\u6574markdown) \u4E09\u4E2A\u53C2\u6570\uFF0C\u81EA\u52A8\u5957\u7528\u6A21\u677F",parameters:{type:"object",properties:{category:{type:"string",description:"\u77E5\u8BC6\u70B9\u5206\u7C7B\uFF0C\u5982\uFF1A\u6838\u5FC3\u6982\u5FF5\u3001\u65B9\u6CD5\u8BBA\u3001\u7ECF\u5178\u6848\u4F8B\u3001\u884C\u4E1A\u5206\u6790"},title:{type:"string",description:"\u77E5\u8BC6\u70B9\u540D\u79F0"},definition:{type:"string",description:"\u4E00\u53E5\u8BDD\u5B9A\u4E49\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},core_content:{type:"string",description:"\u6838\u5FC3\u5B9A\u4E49\u5185\u5BB9\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},content:{type:"string",description:"\u5B8C\u6574markdown\u5185\u5BB9\uFF08\u53EF\u9009\uFF0C\u63D0\u4F9B\u540E\u5FFD\u7565\u5176\u4ED6\u683C\u5F0F\u5316\u53C2\u6570\uFF09\u3002\u63A8\u8350\u4F7F\u7528\u6B64\u53C2\u6570\uFF0C\u76F4\u63A5\u5C06\u5B8C\u6574\u76849\u7AE0markdown\u4F20\u5165"},key_points:{type:"string",description:"\u6838\u5FC3\u8981\u70B9\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},cases:{type:"string",description:"\u7ECF\u5178\u6848\u4F8B\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},methods:{type:"string",description:"\u5B9E\u8DF5\u65B9\u6CD5\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},misconceptions:{type:"string",description:"\u5E38\u89C1\u8BEF\u533A\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},related_topics:{type:"string",description:"\u76F8\u5173\u77E5\u8BC6\u70B9\uFF0C\u9017\u53F7\u5206\u9694\uFF08\u53EF\u9009\uFF09"},source_refs:{type:"string",description:"\u539F\u6587\u51FA\u5904\u8DEF\u5F84\uFF0C\u9017\u53F7\u5206\u9694\uFF08\u53EF\u9009\uFF09"},insights:{type:"string",description:"\u5BF9\u76EE\u6807\u4EBA\u7FA4\u7684\u542F\u793A\uFF08\u53EF\u9009\uFF09"},maturity:{type:"string",description:"\u6210\u719F\u5EA6\u7EA7\u522B",enum:["\u5B8C\u6574\u7EA7","\u57FA\u7840\u7EA7","\u6846\u67B6\u7EA7"]}},required:["category","title"]},execute:async e=>{try{let n=`${(0,a.normalizePath)(this.settings.knowledgeBasePath)}/10-\u77E5\u8BC6\u70B9\u5E93/${e.category}`;await this.ensureFolder(n);let s=new Date().toISOString().split("T")[0],i=`${n}/${e.title}.md`,o=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(i));if(o&&o instanceof a.TFile)return{success:!1,content:`\u77E5\u8BC6\u70B9\u9875\u9762\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${i}\u3002\u8BF7\u4F7F\u7528 update_knowledge_page \u8FFD\u52A0\u5185\u5BB9\u3002`};if(e.content)return await this.createFileOnly(i,e.content),{success:!0,content:`\u77E5\u8BC6\u70B9\u9875\u9762\u5DF2\u521B\u5EFA: ${i}\uFF08\u4F7F\u7528\u5B8C\u6574markdown\u5185\u5BB9\uFF09

\u63A5\u4E0B\u6765\u5FC5\u987B\u6267\u884C\uFF1A
1. \u4F7F\u7528 update_index \u5DE5\u5177 update_index action=add_entry \u4EE5\u66F4\u65B0\u7D22\u5F15
2. \u4F7F\u7528 append_vault_file \u8FFD\u52A0\u66F4\u65B0\u65E5\u5FD7\u5230 30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md

\u6216\u8005\u76F4\u63A5\u4F7F\u7528 create_and_index_page \u4E00\u7AD9\u5F0F\u5B8C\u6210\u4E0A\u8FF0\u5168\u90E8\u6B65\u9AA4\u3002`};let c=e.maturity?`${e.maturity}`:"\u57FA\u7840\u7EA7",l=c.includes("\u5B8C\u6574")?"\u{1F7E2}":c.includes("\u6846\u67B6")?"\u{1F534}":"\u{1F7E1}",u=`### \u8981\u70B91\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(e.key_points)try{u=JSON.parse(e.key_points).map((g,_)=>`### \u8981\u70B9${_+1}\uFF1A${g.name||g.title}

${g.content||g.description||""}`).join(`

`)}catch(y){u=e.key_points}let d=`### \u6848\u4F8B1\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(e.cases)try{d=JSON.parse(e.cases).map((g,_)=>`### \u6848\u4F8B${_+1}\uFF1A${g.name||g.title}

${g.content||g.description||""}`).join(`

`)}catch(y){d=e.cases}let m=`### \u65B9\u6CD51\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(e.methods)try{m=JSON.parse(e.methods).map((g,_)=>`### \u65B9\u6CD5${_+1}\uFF1A${g.name||g.title}

${g.content||g.description||""}`).join(`

`)}catch(y){m=e.methods}let r=`### \u8BEF\u533A1\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(e.misconceptions)try{r=JSON.parse(e.misconceptions).map((g,_)=>`### \u8BEF\u533A${_+1}\uFF1A${g.name||g.title}

${g.content||g.description||""}`).join(`

`)}catch(y){r=e.misconceptions}let p=(e.related_topics||"").split(",").filter(y=>y.trim()).map(y=>`- [[${y.trim()}]]`).join(`
`),h=(e.source_refs||"").split(",").filter(y=>y.trim()).map(y=>`- [[${y.trim()}]]`).join(`
`),f=`# ${e.title}

> ${e.definition||"\u5F85\u8865\u5145"}

> ${l} ${c} | \u6700\u540E\u66F4\u65B0\uFF1A${s}

---

## \u4E00\u3001\u6838\u5FC3\u5B9A\u4E49

${e.core_content||"\u5F85\u8865\u5145"}

---

## \u4E8C\u3001\u6838\u5FC3\u8981\u70B9

${u}

---

## \u4E09\u3001\u7ECF\u5178\u6848\u4F8B

${d}

---

## \u56DB\u3001\u5B9E\u8DF5\u65B9\u6CD5

${m}

---

## \u4E94\u3001\u5E38\u89C1\u8BEF\u533A

${r}

---

## \u516D\u3001\u76F8\u5173\u77E5\u8BC6\u70B9

${p||"- [\u5F85\u8865\u5145]"}

---

## \u4E03\u3001\u539F\u6587\u51FA\u5904

> \u26A0\uFE0F \u94FE\u63A5\u89C4\u8303\uFF1A\u539F\u6587\u51FA\u5904\u5FC5\u987B\u4F7F\u7528 Obsidian \u53CC\u5411\u94FE\u63A5 [[\u8DEF\u5F84]] \u8BED\u6CD5

${h||"- [\u5F85\u8865\u5145]"}

---

## \u516B\u3001\u5BF9\u76EE\u6807\u4EBA\u7FA4\u7684\u542F\u793A

${e.insights||"[\u5F85\u8865\u5145]"}

---

## \u4E5D\u3001\u66F4\u65B0\u65E5\u5FD7

| \u65E5\u671F | \u64CD\u4F5C\u7C7B\u578B | \u89E6\u53D1\u6765\u6E90 | \u53D8\u66F4\u5185\u5BB9 |
|------|---------|---------|----------|
| ${s} | \u521B\u5EFA | \u7528\u6237\u6307\u4EE4 | \u521D\u59CB\u5316\u9875\u9762 |
`;return await this.createFileOnly(i,f),{success:!0,content:`\u77E5\u8BC6\u70B9\u9875\u9762\u5DF2\u521B\u5EFA: ${i}

\u63A5\u4E0B\u6765\u5FC5\u987B\u6267\u884C\uFF1A
1. \u4F7F\u7528 update_index \u5DE5\u5177 action=add_entry \u66F4\u65B0\u7D22\u5F15
2. \u5728\u81F3\u5C113\u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u6DFB\u52A0\u5165\u94FE
3. \u4F7F\u7528 append_vault_file \u8FFD\u52A0\u66F4\u65B0\u65E5\u5FD7\u5230 30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md

\u63A8\u8350\u76F4\u63A5\u4F7F\u7528 create_and_index_page \u4E00\u7AD9\u5F0F\u5B8C\u6210\u4EE5\u4E0A\u6B65\u9AA4\u3002`}}catch(t){return{success:!1,content:`\u521B\u5EFA\u77E5\u8BC6\u70B9\u9875\u9762\u5931\u8D25: ${t.message}`}}}}),this.tools.set("create_and_index_page",{name:"create_and_index_page",description:"\u4E00\u7AD9\u5F0F\u521B\u5EFA\u77E5\u8BC6\u9875\u9762 + \u66F4\u65B0\u7D22\u5F15 + \u8FFD\u52A0\u65E5\u5FD7\u3002\u63A8\u8350\u4F7F\u7528\u6B64\u5DE5\u5177\u66FF\u4EE3\u5206\u522B\u8C03\u7528 create_knowledge_page + update_index + append_vault_file",parameters:{type:"object",properties:{page_type:{type:"string",description:"\u9875\u9762\u7C7B\u578B\uFF1Aknowledge=\u77E5\u8BC6\u70B9, person=\u4EBA\u7269\u4F20\u8BB0, organization=\u7EC4\u7EC7\u6863\u6848",enum:["knowledge","person","organization"]},category:{type:"string",description:"\u77E5\u8BC6\u70B9\u5206\u7C7B\uFF08page_type=knowledge\u65F6\u5FC5\u586B\uFF09\uFF0C\u5982\uFF1A\u6838\u5FC3\u6982\u5FF5\u3001\u65B9\u6CD5\u8BBA"},title:{type:"string",description:"\u9875\u9762\u6807\u9898/\u77E5\u8BC6\u70B9\u540D\u79F0"},content:{type:"string",description:"\u5B8C\u6574\u7684markdown\u9875\u9762\u5185\u5BB9\uFF08\u5FC5\u987B\u5305\u542B\u5168\u90E89\u4E2A\u7AE0\u8282\uFF09"},entry_category:{type:"string",description:"\u7D22\u5F15\u4E2D\u7684\u5206\u7C7B\u540D\uFF08\u53EF\u9009\uFF0C\u9ED8\u8BA4\u4E0Ecategory\u76F8\u540C\uFF09"},entry_description:{type:"string",description:"\u7D22\u5F15\u6761\u76EE\u7684\u4E00\u53E5\u8BDD\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09"},maturity:{type:"string",description:"\u6210\u719F\u5EA6\u7EA7\u522B",enum:["\u5B8C\u6574\u7EA7","\u57FA\u7840\u7EA7","\u6846\u67B6\u7EA7"]},keywords:{type:"string",description:"\u65B0\u589E\u5173\u952E\u8BCD\uFF0C\u9017\u53F7\u5206\u9694\uFF08\u53EF\u9009\uFF09"}},required:["page_type","title","content"]},execute:async e=>{var t,n;try{let s=(0,a.normalizePath)(this.settings.knowledgeBasePath),i=new Date().toISOString().split("T")[0],o=(t=e.maturity)!=null&&t.includes("\u5B8C\u6574")?"\u{1F7E2}":(n=e.maturity)!=null&&n.includes("\u6846\u67B6")?"\u{1F534}":"\u{1F7E1}",c=e.category||"\u672A\u5206\u7C7B";e.page_type==="person"?c="\u4EBA\u7269\u4F20\u8BB0":e.page_type==="organization"&&(c="\u7EC4\u7EC7\u6863\u6848");let l=`${s}/10-\u77E5\u8BC6\u70B9\u5E93/${c}`;await this.ensureFolder(l);let u=`${l}/${e.title}.md`,d=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(u));if(d&&d instanceof a.TFile)return{success:!1,content:`\u9875\u9762\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${u}\u3002\u8BF7\u4F7F\u7528 update_knowledge_page \u8FFD\u52A0\u5185\u5BB9\u3002`};await this.createFileOnly(u,e.content);let m=e.entry_category||c,r=`${s}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,p=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(r));if(p&&p instanceof a.TFile){let g=await this.app.vault.read(p),_=m.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),w=new RegExp(`###\\s+\\d+\\.\\s+${_}\\s*\\(\\d+\u4E2A\\)`),v=g.match(w);if(v){let k=g.indexOf(v[0]),x=g.indexOf(`
### `,k+1),L=x===-1?g.indexOf(`
---`,k):x,F=g.substring(k,L),S=F.match(/\((\d+)个\)/),T=S?parseInt(S[1]):0,E=F.replace(`(${T}\u4E2A)`,`(${T+1}\u4E2A)`).replace(/（暂无知识点）/,""),A=`- [[${e.title}]] ${o} - ${e.entry_description||"\u5F85\u8865\u5145"}`,N=g.substring(0,k)+E.trimEnd()+`
`+A+`
`+g.substring(L);await this.app.vault.modify(p,N);let W=N.match(/知识点总数：(\d+)个/);if(W){let J=parseInt(W[1])+1;await this.app.vault.modify(p,N.replace(`\u77E5\u8BC6\u70B9\u603B\u6570\uFF1A${W[1]}\u4E2A`,`\u77E5\u8BC6\u70B9\u603B\u6570\uFF1A${J}\u4E2A`))}}if(e.keywords){let k=`${s}/20-\u77E5\u8BC6\u7D22\u5F15/\u5173\u952E\u8BCD\u7D22\u5F15.md`,x=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(k));if(x&&x instanceof a.TFile){let L=await this.app.vault.read(x),F=e.keywords.split(",").map(S=>`| ${S.trim()} | [[${e.title}]] | 1 |`).join(`
`);await this.app.vault.modify(x,L.replace("\uFF08\u6682\u65E0\u5173\u952E\u8BCD\uFF09",F))}}}let h=`${s}/30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md`,f=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(h)),y=`
## ${i} | \u65B0\u5EFA\u77E5\u8BC6\u70B9\uFF1A${e.title}

**\u64CD\u4F5C\u4EBA\uFF1A** \u77E5\u8BC6\u5E93\u7EF4\u62A4\u8005
**\u53D8\u66F4\u7C7B\u578B\uFF1A** \u65B0\u5EFA
**\u89E6\u53D1\u6765\u6E90\uFF1A** \u7528\u6237\u6307\u4EE4

### \u53D8\u66F4\u5185\u5BB9

\u521B\u5EFA\u77E5\u8BC6\u70B9\u9875\u9762\uFF1A${e.title}\uFF08${c}\uFF09

### \u65B0\u5EFA\u9875\u9762

- ${u}

### \u540C\u6B65\u66F4\u65B0

- 20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md - \u6DFB\u52A0\u6761\u76EE

---
`;if(f&&f instanceof a.TFile){let g=await this.app.vault.read(f);await this.app.vault.modify(f,g+y)}else await this.createFileOnly(h,`# \u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7
${y}`);return{success:!0,content:`\u4E00\u7AD9\u5F0F\u64CD\u4F5C\u5B8C\u6210\uFF01
1. \u2705 \u9875\u9762\u5DF2\u521B\u5EFA: ${u}
2. \u2705 \u7D22\u5F15\u5DF2\u66F4\u65B0: ${m} +1
3. \u2705 \u66F4\u65B0\u65E5\u5FD7\u5DF2\u8FFD\u52A0

\u8BF7\u7EE7\u7EED\uFF1A
4. \u5728\u81F3\u5C113\u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u6DFB\u52A0\u5165\u94FE\uFF08\u7528 append_vault_file \u8FFD\u52A0 [[${e.title}]] \u5230\u76F8\u5173\u9875\u9762\u7684\u300C\u76F8\u5173\u77E5\u8BC6\u70B9\u300D\u7AE0\u8282\uFF09
5. \u6267\u884C\u81EA\u68C0\u6E05\u5355`}}catch(s){return{success:!1,content:`\u4E00\u7AD9\u5F0F\u521B\u5EFA\u5931\u8D25: ${s.message}`}}}}),this.tools.set("create_person_page",{name:"create_person_page",description:"\u521B\u5EFA\u4EBA\u7269\u4F20\u8BB0\u9875\u9762\uFF0C\u81EA\u52A8\u5E94\u7528\u4EBA\u7269\u4F20\u8BB0\u6A21\u677F",parameters:{type:"object",properties:{name:{type:"string",description:"\u4EBA\u7269\u540D\u79F0"},intro:{type:"string",description:"\u4E00\u53E5\u8BDD\u4ECB\u7ECD"},birth_year:{type:"string",description:"\u51FA\u751F\u5E74\u4EFD"},identity:{type:"string",description:"\u4E3B\u8981\u8EAB\u4EFD/\u804C\u4E1A"},field_relation:{type:"string",description:"\u4E0E\u672C\u9886\u57DF\u7684\u5173\u7CFB"},biography:{type:"string",description:"\u751F\u5E73\u7ECF\u5386"},contributions:{type:"string",description:"\u6838\u5FC3\u8D21\u732E\uFF0CJSON\u6570\u7EC4\u683C\u5F0F"},quotes:{type:"string",description:"\u7ECF\u5178\u8BED\u5F55\uFF0CJSON\u6570\u7EC4\u683C\u5F0F"},influence:{type:"string",description:"\u5F71\u54CD\u4E0E\u542F\u793A"},related_topics:{type:"string",description:"\u76F8\u5173\u77E5\u8BC6\u70B9\uFF0C\u9017\u53F7\u5206\u9694"},related_orgs:{type:"string",description:"\u76F8\u5173\u7EC4\u7EC7\uFF0C\u9017\u53F7\u5206\u9694"},source_refs:{type:"string",description:"\u539F\u6587\u51FA\u5904\u8DEF\u5F84\uFF0C\u9017\u53F7\u5206\u9694"},maturity:{type:"string",description:"\u6210\u719F\u5EA6\u7EA7\u522B",enum:["\u{1F7E2} \u5B8C\u6574\u7EA7","\u{1F7E1} \u57FA\u7840\u7EA7","\u{1F534} \u6846\u67B6\u7EA7"]}},required:["name","intro","identity"]},execute:async e=>{try{let n=`${(0,a.normalizePath)(this.settings.knowledgeBasePath)}/10-\u77E5\u8BC6\u70B9\u5E93/\u4EBA\u7269\u4F20\u8BB0`;await this.ensureFolder(n);let s=new Date().toISOString().split("T")[0],i=e.maturity||"\u{1F7E1} \u57FA\u7840\u7EA7",o=`### \u8D21\u732E1\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(e.contributions)try{o=JSON.parse(e.contributions).map((f,y)=>`### \u8D21\u732E${y+1}\uFF1A${f.name||f.title}

${f.content||f.description||""}`).join(`

`)}catch(h){o=e.contributions}let c="> [\u5F85\u8865\u5145]";if(e.quotes)try{c=JSON.parse(e.quotes).map(f=>`> "${f.content||f.text}"
> \u2014\u2014 ${f.source||"\u51FA\u5904\u5F85\u8865\u5145"}`).join(`

`)}catch(h){c=e.quotes}let l=(e.related_topics||"").split(",").filter(h=>h.trim()).map(h=>`- [[${h.trim()}]]`).join(`
`),u=(e.related_orgs||"").split(",").filter(h=>h.trim()).map(h=>`- [[${h.trim()}]]`).join(`
`),d=(e.source_refs||"").split(",").filter(h=>h.trim()).map(h=>`- [[${h.trim()}]]`).join(`
`),m=`# ${e.name}

> ${e.intro}

> ${i} | \u7EA62000\u5B57 | \u6700\u540E\u66F4\u65B0\uFF1A${s}

---

## \u4E00\u3001\u4EBA\u7269\u7B80\u4ECB

- **\u59D3\u540D**\uFF1A${e.name}
- **\u751F\u5352\u5E74**\uFF1A${e.birth_year||"\u5F85\u8865\u5145"}
- **\u8EAB\u4EFD**\uFF1A${e.identity}
- **\u4E0E\u9886\u57DF\u7684\u5173\u7CFB**\uFF1A${e.field_relation||"\u5F85\u8865\u5145"}

---

## \u4E8C\u3001\u751F\u5E73\u7ECF\u5386

${e.biography||`### \u65E9\u671F\u7ECF\u5386

[\u5F85\u8865\u5145]

### \u5173\u952E\u8F6C\u6298

[\u5F85\u8865\u5145]

### \u4E3B\u8981\u6210\u5C31

[\u5F85\u8865\u5145]`}

---

## \u4E09\u3001\u6838\u5FC3\u8D21\u732E

${o}

---

## \u56DB\u3001\u7ECF\u5178\u8BED\u5F55

${c}

---

## \u4E94\u3001\u5F71\u54CD\u4E0E\u542F\u793A

${e.influence||"[\u5F85\u8865\u5145]"}

---

## \u516D\u3001\u76F8\u5173\u77E5\u8BC6\u70B9

${l||"- [\u5F85\u8865\u5145]"}

---

## \u4E03\u3001\u76F8\u5173\u7EC4\u7EC7

${u||"- [\u5F85\u8865\u5145]"}

---

## \u516B\u3001\u539F\u6587\u51FA\u5904

> \u26A0\uFE0F \u94FE\u63A5\u89C4\u8303\uFF1A\u5FC5\u987B\u4F7F\u7528 Obsidian \u53CC\u5411\u94FE\u63A5 [[\u8DEF\u5F84]] \u8BED\u6CD5

${d||"- [\u5F85\u8865\u5145]"}

---

## \u4E5D\u3001\u66F4\u65B0\u65E5\u5FD7

| \u65E5\u671F | \u64CD\u4F5C\u7C7B\u578B | \u89E6\u53D1\u6765\u6E90 | \u53D8\u66F4\u5185\u5BB9 |
|------|---------|---------|----------|
| ${s} | \u521B\u5EFA | \u7528\u6237\u6307\u4EE4 | \u521D\u59CB\u5316\u9875\u9762 |
`,r=`${n}/${e.name}.md`,p=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(r));return p&&p instanceof a.TFile?{success:!1,content:`\u4EBA\u7269\u4F20\u8BB0\u9875\u9762\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${r}\u3002\u8BF7\u4F7F\u7528 update_knowledge_page \u8FFD\u52A0\u5185\u5BB9\u3002`}:(await this.createFileOnly(r,m),{success:!0,content:`\u4EBA\u7269\u4F20\u8BB0\u9875\u9762\u5DF2\u521B\u5EFA: ${r}

\u8BF7\u7EE7\u7EED\u6267\u884C\uFF1A
1. \u4F7F\u7528 update_index \u5DE5\u5177\u66F4\u65B0\u7D22\u5F15
2. \u5728\u81F3\u5C113\u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u6DFB\u52A0\u5165\u94FE
3. \u8FFD\u52A0\u66F4\u65B0\u65E5\u5FD7`})}catch(t){return{success:!1,content:`\u521B\u5EFA\u4EBA\u7269\u4F20\u8BB0\u9875\u9762\u5931\u8D25: ${t.message}`}}}}),this.tools.set("create_organization_page",{name:"create_organization_page",description:"\u521B\u5EFA\u7EC4\u7EC7\u6863\u6848\u9875\u9762\uFF0C\u81EA\u52A8\u5E94\u7528\u7EC4\u7EC7\u6863\u6848\u6A21\u677F",parameters:{type:"object",properties:{name:{type:"string",description:"\u7EC4\u7EC7\u540D\u79F0"},intro:{type:"string",description:"\u4E00\u53E5\u8BDD\u4ECB\u7ECD"},founded_year:{type:"string",description:"\u6210\u7ACB\u5E74\u4EFD"},headquarters:{type:"string",description:"\u603B\u90E8\u4F4D\u7F6E"},main_business:{type:"string",description:"\u4E3B\u8425\u4E1A\u52A1"},industry:{type:"string",description:"\u884C\u4E1A\u5206\u7C7B"},history:{type:"string",description:"\u53D1\u5C55\u5386\u7A0B"},core_business:{type:"string",description:"\u6838\u5FC3\u4E1A\u52A1/\u6A21\u5F0F\u63CF\u8FF0"},key_figures:{type:"string",description:"\u5173\u952E\u4EBA\u7269\uFF0C\u9017\u53F7\u5206\u9694"},events:{type:"string",description:"\u91CD\u8981\u4E8B\u4EF6\uFF0CJSON\u6570\u7EC4\u683C\u5F0F"},related_topics:{type:"string",description:"\u76F8\u5173\u77E5\u8BC6\u70B9\uFF0C\u9017\u53F7\u5206\u9694"},source_refs:{type:"string",description:"\u539F\u6587\u51FA\u5904\u8DEF\u5F84\uFF0C\u9017\u53F7\u5206\u9694"},maturity:{type:"string",description:"\u6210\u719F\u5EA6\u7EA7\u522B",enum:["\u{1F7E2} \u5B8C\u6574\u7EA7","\u{1F7E1} \u57FA\u7840\u7EA7","\u{1F534} \u6846\u67B6\u7EA7"]}},required:["name","intro","main_business"]},execute:async e=>{try{let n=`${(0,a.normalizePath)(this.settings.knowledgeBasePath)}/10-\u77E5\u8BC6\u70B9\u5E93/\u7EC4\u7EC7\u6863\u6848`;await this.ensureFolder(n);let s=new Date().toISOString().split("T")[0],i=e.maturity||"\u{1F7E1} \u57FA\u7840\u7EA7",o=`### \u4E8B\u4EF61\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(e.events)try{o=JSON.parse(e.events).map((h,f)=>`### \u4E8B\u4EF6${f+1}\uFF1A${h.name||h.title}

${h.content||h.description||""}`).join(`

`)}catch(p){o=e.events}let c=(e.key_figures||"").split(",").filter(p=>p.trim()).map(p=>`- [[${p.trim()}]]`).join(`
`),l=(e.related_topics||"").split(",").filter(p=>p.trim()).map(p=>`- [[${p.trim()}]]`).join(`
`),u=(e.source_refs||"").split(",").filter(p=>p.trim()).map(p=>`- [[${p.trim()}]]`).join(`
`),d=`# ${e.name}

> ${e.intro}

> ${i} | \u7EA62000\u5B57 | \u6700\u540E\u66F4\u65B0\uFF1A${s}

---

## \u4E00\u3001\u7EC4\u7EC7\u7B80\u4ECB

- **\u540D\u79F0**\uFF1A${e.name}
- **\u6210\u7ACB\u5E74\u4EFD**\uFF1A${e.founded_year||"\u5F85\u8865\u5145"}
- **\u603B\u90E8\u4F4D\u7F6E**\uFF1A${e.headquarters||"\u5F85\u8865\u5145"}
- **\u4E3B\u8425\u4E1A\u52A1**\uFF1A${e.main_business}
- **\u884C\u4E1A\u5206\u7C7B**\uFF1A${e.industry||"\u5F85\u8865\u5145"}

---

## \u4E8C\u3001\u53D1\u5C55\u5386\u7A0B

${e.history||`### \u521B\u7ACB\u9636\u6BB5

[\u5F85\u8865\u5145]

### \u6210\u957F\u9636\u6BB5

[\u5F85\u8865\u5145]

### \u73B0\u72B6

[\u5F85\u8865\u5145]`}

---

## \u4E09\u3001\u6838\u5FC3\u4E1A\u52A1/\u6A21\u5F0F

${e.core_business||"[\u5F85\u8865\u5145]"}

---

## \u56DB\u3001\u5173\u952E\u4EBA\u7269

${c||"- [\u5F85\u8865\u5145]"}

---

## \u4E94\u3001\u91CD\u8981\u4E8B\u4EF6/\u6848\u4F8B

${o}

---

## \u516D\u3001\u76F8\u5173\u77E5\u8BC6\u70B9

${l||"- [\u5F85\u8865\u5145]"}

---

## \u4E03\u3001\u539F\u6587\u51FA\u5904

> \u26A0\uFE0F \u94FE\u63A5\u89C4\u8303\uFF1A\u5FC5\u987B\u4F7F\u7528 Obsidian \u53CC\u5411\u94FE\u63A5 [[\u8DEF\u5F84]] \u8BED\u6CD5

${u||"- [\u5F85\u8865\u5145]"}

---

## \u516B\u3001\u6700\u65B0\u52A8\u6001

[\u5F85\u8865\u5145]

---

## \u4E5D\u3001\u66F4\u65B0\u65E5\u5FD7

| \u65E5\u671F | \u64CD\u4F5C\u7C7B\u578B | \u89E6\u53D1\u6765\u6E90 | \u53D8\u66F4\u5185\u5BB9 |
|------|---------|---------|----------|
| ${s} | \u521B\u5EFA | \u7528\u6237\u6307\u4EE4 | \u521D\u59CB\u5316\u9875\u9762 |
`,m=`${n}/${e.name}.md`,r=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(m));return r&&r instanceof a.TFile?{success:!1,content:`\u7EC4\u7EC7\u6863\u6848\u9875\u9762\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${m}\u3002\u8BF7\u4F7F\u7528 update_knowledge_page \u8FFD\u52A0\u5185\u5BB9\u3002`}:(await this.createFileOnly(m,d),{success:!0,content:`\u7EC4\u7EC7\u6863\u6848\u9875\u9762\u5DF2\u521B\u5EFA: ${m}

\u8BF7\u7EE7\u7EED\u6267\u884C\uFF1A
1. \u4F7F\u7528 update_index \u5DE5\u5177\u66F4\u65B0\u7D22\u5F15
2. \u5728\u81F3\u5C113\u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u6DFB\u52A0\u5165\u94FE
3. \u8FFD\u52A0\u66F4\u65B0\u65E5\u5FD7`})}catch(t){return{success:!1,content:`\u521B\u5EFA\u7EC4\u7EC7\u6863\u6848\u9875\u9762\u5931\u8D25: ${t.message}`}}}}),this.tools.set("update_knowledge_page",{name:"update_knowledge_page",description:"\u5411\u5DF2\u6709\u7684\u77E5\u8BC6\u70B9\u9875\u9762\u8FFD\u52A0\u5185\u5BB9\u3002\u4E0D\u53EF\u66FF\u6362\u6216\u5220\u9664\u5DF2\u6709\u5185\u5BB9",parameters:{type:"object",properties:{path:{type:"string",description:"\u77E5\u8BC6\u70B9\u9875\u9762\u7684\u8DEF\u5F84"},section:{type:"string",description:"\u8981\u66F4\u65B0\u7684\u7AE0\u8282\u6838\u5FC3\u540D\u79F0\uFF0C\u5982\uFF1A\u6838\u5FC3\u5B9A\u4E49\u3001\u6838\u5FC3\u8981\u70B9\u3001\u7ECF\u5178\u6848\u4F8B\u3001\u5B9E\u8DF5\u65B9\u6CD5\u3001\u5E38\u89C1\u8BEF\u533A\u3001\u76F8\u5173\u77E5\u8BC6\u70B9\u3001\u539F\u6587\u51FA\u5904\u3001\u542F\u793A\u3001\u66F4\u65B0\u65E5\u5FD7"},content:{type:"string",description:"\u8981\u8FFD\u52A0\u7684\u7AE0\u8282\u5185\u5BB9\uFF08\u53EA\u5199\u7AE0\u8282\u5185\u5BB9\u672C\u8EAB\uFF0C\u4E0D\u5305\u542B\u7AE0\u8282\u6807\u9898\uFF09"},append_mode:{type:"string",description:"\u56FA\u5B9A\u4E3A append\uFF08\u5728\u7AE0\u8282\u672B\u5C3E\u8FFD\u52A0\u5185\u5BB9\uFF09\u3002\u6CE8\u610F\uFF1A\u4E0D\u652F\u6301 replace\uFF0C\u4E0D\u5F97\u5220\u9664\u5DF2\u6709\u5185\u5BB9",enum:["append"]}},required:["path","section","content"]},execute:async e=>{try{let t=(0,a.normalizePath)(e.path),n=this.app.vault.getAbstractFileByPath(t);if(!n||!(n instanceof a.TFile))return{success:!1,content:`\u6587\u4EF6\u4E0D\u5B58\u5728: ${t}`};let s=await this.app.vault.read(n),o={\u6838\u5FC3\u5B9A\u4E49:["\u6838\u5FC3\u5B9A\u4E49","\u6838\u5FC3\u5B9A\u4E49"],\u6838\u5FC3\u8981\u70B9:["\u6838\u5FC3\u8981\u70B9","\u8981\u70B9"],\u7ECF\u5178\u6848\u4F8B:["\u7ECF\u5178\u6848\u4F8B","\u6848\u4F8B"],\u5B9E\u8DF5\u65B9\u6CD5:["\u5B9E\u8DF5\u65B9\u6CD5","\u65B9\u6CD5"],\u5E38\u89C1\u8BEF\u533A:["\u5E38\u89C1\u8BEF\u533A","\u8BEF\u533A"],\u76F8\u5173\u77E5\u8BC6\u70B9:["\u76F8\u5173\u77E5\u8BC6\u70B9","\u5173\u8054"],\u539F\u6587\u51FA\u5904:["\u539F\u6587\u51FA\u5904","\u51FA\u5904"],\u542F\u793A:["\u542F\u793A","\u5BF9\u76EE\u6807\u4EBA\u7FA4\u7684\u542F\u793A"],\u66F4\u65B0\u65E5\u5FD7:["\u66F4\u65B0\u65E5\u5FD7","\u65E5\u5FD7"]}[e.section]||[e.section],c=-1,l="";for(let w of o){let v=new RegExp(`##\\s*[\\d\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u3001\\.]*\\s*${w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`),k=s.match(v);if(k){c=k.index,l=k[0];break}}if(c===-1){let w=new RegExp(`##\\s*[\\d\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u3001\\.]*\\s*${e.section.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`),v=s.match(w);if(v)c=v.index,l=v[0];else return{success:!1,content:`\u672A\u627E\u5230\u7AE0\u8282\u300C${e.section}\u300D\u3002\u6587\u4EF6\u4E2D\u7684\u7AE0\u8282\u6807\u9898\u683C\u5F0F\u53EF\u80FD\u4E0D\u540C\uFF0C\u8BF7\u5148\u4F7F\u7528 read_vault_file \u8BFB\u53D6\u6587\u4EF6\u67E5\u770B\u5B9E\u9645\u7AE0\u8282\u540D\u79F0`}}let u=s.indexOf(`
## `,c+l.length),d=u===-1?s.length:u,m=s.substring(0,c),r=s.substring(d),p=s.substring(c,d),h=m+p+`

`+e.content+r,y=`| ${new Date().toISOString().split("T")[0]} | \u4FEE\u6539 | \u7528\u6237\u6307\u4EE4 | \u66F4\u65B0${e.section}\u7AE0\u8282 |`,g=/##\s*[一二三四五六七八九十、]*\s*更新日志/,_=h.match(g);if(_){let w=_.index,v=h.indexOf("| \u65E5\u671F |",w);if(v!==-1){let k=h.indexOf(`
`,v),x=h.indexOf(`
`,k+1);h=h.substring(0,x+1)+y+`
`+h.substring(x+1)}}return await this.app.vault.modify(n,h),{success:!0,content:`\u7AE0\u8282\u300C${e.section}\u300D\u5DF2\u66F4\u65B0: ${t}

\u8BF7\u6267\u884C\u81EA\u68C0\u6E05\u5355\u5E76\u66F4\u65B0\u96C6\u4E2D\u65E5\u5FD7\u3002`}}catch(t){return{success:!1,content:`\u66F4\u65B0\u77E5\u8BC6\u70B9\u9875\u9762\u5931\u8D25: ${t.message}`}}}}),this.tools.set("update_index",{name:"update_index",description:"\u66F4\u65B0\u77E5\u8BC6\u5E93\u7D22\u5F15\u6587\u4EF6\uFF08\u603B\u7D22\u5F15\u3001\u5173\u952E\u8BCD\u7D22\u5F15\u3001\u5173\u7CFB\u56FE\u8C31\uFF09",parameters:{type:"object",properties:{action:{type:"string",description:"\u66F4\u65B0\u7C7B\u578B",enum:["add_entry","refresh_all"]},entry_name:{type:"string",description:"\u6761\u76EE\u540D\u79F0"},entry_category:{type:"string",description:"\u6761\u76EE\u5206\u7C7B"},entry_description:{type:"string",description:"\u4E00\u53E5\u8BDD\u63CF\u8FF0"},entry_maturity:{type:"string",description:"\u6210\u719F\u5EA6",enum:["\u{1F7E2}","\u{1F7E1}","\u{1F534}"]},keywords:{type:"string",description:"\u65B0\u589E\u5173\u952E\u8BCD\uFF0C\u9017\u53F7\u5206\u9694"}},required:["action"]},execute:async e=>{try{let t=(0,a.normalizePath)(this.settings.knowledgeBasePath),n=`${t}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,s=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(n));if(!s||!(s instanceof a.TFile))return{success:!1,content:`\u7D22\u5F15\u6587\u4EF6\u4E0D\u5B58\u5728: ${n}`};if(e.action==="add_entry"&&e.entry_name&&e.entry_category){let i=await this.app.vault.read(s),o=e.entry_category,c=new RegExp(`###\\s+\\d+\\.\\s+${o.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*\\(\\d+\u4E2A\\)`),l=i.match(c);if(l){let u=i.indexOf(l[0]),d=i.indexOf(`
### `,u+1),m=d===-1?i.indexOf(`
---`,u):d,r=i.substring(u,m),p=r.match(/\((\d+)个\)/),h=p?parseInt(p[1]):0,f=h+1,y=r.replace(`(${h}\u4E2A)`,`(${f}\u4E2A)`).replace(/（暂无知识点）/,""),g=e.entry_maturity||"\u{1F7E1}",_=`- [[${e.entry_name}]] ${g} - ${e.entry_description||"\u5F85\u8865\u5145"}`,w=i.substring(0,u)+y.trimEnd()+`
`+_+`
`+i.substring(m);await this.app.vault.modify(s,w);let v=w.match(/知识点总数：(\d+)个/);if(v){let k=parseInt(v[1])+1,x=w.replace(`\u77E5\u8BC6\u70B9\u603B\u6570\uFF1A${v[1]}\u4E2A`,`\u77E5\u8BC6\u70B9\u603B\u6570\uFF1A${k}\u4E2A`);await this.app.vault.modify(s,x)}}if(e.keywords){let u=`${t}/20-\u77E5\u8BC6\u7D22\u5F15/\u5173\u952E\u8BCD\u7D22\u5F15.md`,d=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(u));if(d&&d instanceof a.TFile){let m=await this.app.vault.read(d),r=e.keywords.split(",").map(h=>`| ${h.trim()} | [[${e.entry_name}]] | 1 |`).join(`
`),p=m.replace("\uFF08\u6682\u65E0\u5173\u952E\u8BCD\uFF09",r);await this.app.vault.modify(d,p)}}return{success:!0,content:`\u7D22\u5F15\u5DF2\u66F4\u65B0\uFF1A\u6DFB\u52A0 ${e.entry_name} \u5230 ${e.entry_category}`}}return e.action==="refresh_all"?{success:!0,content:"\u8BF7\u4F7F\u7528 list_vault_folder \u5DE5\u5177\u626B\u63CF\u5404\u5206\u7C7B\u76EE\u5F55\uFF0C\u7136\u540E\u624B\u52A8\u66F4\u65B0\u7D22\u5F15\u6570\u91CF\u3002"}:{success:!0,content:"\u7D22\u5F15\u66F4\u65B0\u64CD\u4F5C\u5B8C\u6210"}}catch(t){return{success:!1,content:`\u66F4\u65B0\u7D22\u5F15\u5931\u8D25: ${t.message}`}}}}),this.tools.set("query_knowledge",{name:"query_knowledge",description:"\u67E5\u8BE2\u77E5\u8BC6\u5E93\uFF1A\u5148\u8BFB\u53D6\u7D22\u5F15\u4E86\u89E3\u7ED3\u6784\uFF0C\u518D\u8BFB\u53D6\u76F8\u5173\u77E5\u8BC6\u70B9\u9875\u9762",parameters:{type:"object",properties:{query:{type:"string",description:"\u67E5\u8BE2\u95EE\u9898\u6216\u5173\u952E\u8BCD"}},required:["query"]},execute:async e=>{try{let n=`${(0,a.normalizePath)(this.settings.knowledgeBasePath)}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,s=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(n));if(!s||!(s instanceof a.TFile))return{success:!1,content:`\u77E5\u8BC6\u5E93\u7D22\u5F15\u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u521D\u59CB\u5316\u77E5\u8BC6\u5E93\u3002\u7D22\u5F15\u8DEF\u5F84: ${n}`};let i=await this.app.vault.read(s),o=e.query.toLowerCase(),c=i.split(`
`),l=[];for(let d of c)d.includes("[[")&&d.toLowerCase().includes(o.split(" ")[0])&&l.push(d.trim());let u=`\u77E5\u8BC6\u5E93\u7D22\u5F15\u6982\u89C8:
${i.substring(0,2e3)}

`;return l.length>0?u+=`\u4E0E "${e.query}" \u76F8\u5173\u7684\u6761\u76EE:
${l.join(`
`)}

`:u+=`\u5728\u7D22\u5F15\u4E2D\u672A\u627E\u5230\u4E0E "${e.query}" \u76F4\u63A5\u5339\u914D\u7684\u6761\u76EE\u3002

`,u+="\u8BF7\u6839\u636E\u4EE5\u4E0A\u7D22\u5F15\u4FE1\u606F\uFF0C\u4F7F\u7528 read_vault_file \u5DE5\u5177\u8BFB\u53D6\u76F8\u5173\u77E5\u8BC6\u70B9\u9875\u9762\u7684\u8BE6\u7EC6\u5185\u5BB9\u6765\u56DE\u7B54\u7528\u6237\u95EE\u9898\u3002",{success:!0,content:u}}catch(t){return{success:!1,content:`\u67E5\u8BE2\u77E5\u8BC6\u5E93\u5931\u8D25: ${t.message}`}}}}),this.tools.set("lint_knowledge_base",{name:"lint_knowledge_base",description:"\u5BF9\u77E5\u8BC6\u5E93\u6267\u884C\u6574\u7406\u68C0\u67E5\uFF1A\u68C0\u67E5\u77DB\u76FE\u3001\u5B64\u7ACB\u9875\u9762\u3001\u683C\u5F0F\u95EE\u9898\u7B49",parameters:{type:"object",properties:{check_type:{type:"string",description:"\u68C0\u67E5\u7C7B\u578B",enum:["full","format","content","links"]}},required:[]},execute:async e=>{try{let t=(0,a.normalizePath)(this.settings.knowledgeBasePath),n=e.check_type||"full",s=[],i=`${t}/10-\u77E5\u8BC6\u70B9\u5E93`,o=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(i));if(!o||!(o instanceof a.TFolder))return{success:!1,content:`\u77E5\u8BC6\u70B9\u5E93\u76EE\u5F55\u4E0D\u5B58\u5728: ${i}`};let c=[],l=[],u=new Set,d=r=>{for(let p of r.children)p instanceof a.TFile?(c.push(p),u.add(p.basename),p.stat.size===0&&l.push(p)):p instanceof a.TFolder&&d(p)};if(d(o),l.length>0&&s.push(`\u26A0\uFE0F \u53D1\u73B0 ${l.length} \u4E2A\u7A7A\u6587\u4EF6:
${l.map(r=>`  - ${r.path}`).join(`
`)}`),n==="full"||n==="links"){let r=[],p=new Set;for(let h of c.slice(0,50)){let y=(await this.app.vault.cachedRead(h)).matchAll(/\[\[([^\]]+)\]\]/g);for(let g of y)p.add(g[1].split("|")[0].split("#")[0].trim())}for(let h of u)p.has(h)||r.push(h);r.length>0&&s.push(`\u{1F517} \u53D1\u73B0 ${r.length} \u4E2A\u5B64\u7ACB\u9875\u9762\uFF08\u65E0\u5165\u94FE\uFF09:
${r.slice(0,20).map(h=>`  - ${h}`).join(`
`)}`)}if(n==="full"||n==="format")for(let r of c.slice(0,30)){let p=await this.app.vault.cachedRead(r);p.includes("## \u4E5D\u3001\u66F4\u65B0\u65E5\u5FD7")||s.push(`\u{1F4DD} ${r.basename} \u7F3A\u5C11"\u66F4\u65B0\u65E5\u5FD7"\u7AE0\u8282`),p.includes("## \u4E03\u3001\u539F\u6587\u51FA\u5904")||s.push(`\u{1F4DD} ${r.basename} \u7F3A\u5C11"\u539F\u6587\u51FA\u5904"\u7AE0\u8282`)}if(n==="full"||n==="content"){let r=`${t}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,p=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(r));if(p&&p instanceof a.TFile){let f=(await this.app.vault.read(p)).matchAll(/\((\d+)个\)/g);for(let y of f)parseInt(y[1])>0&&s.push(`\u{1F4CA} \u5206\u7C7B\u8BA1\u6570 ${y[0]} \u9700\u8981\u9A8C\u8BC1\u662F\u5426\u4E0E\u5B9E\u9645\u6587\u4EF6\u6570\u4E00\u81F4`)}}return{success:!0,content:s.length>0?`Lint \u68C0\u67E5\u5B8C\u6210\uFF0C\u53D1\u73B0 ${s.length} \u4E2A\u95EE\u9898:

${s.join(`

`)}

\u8BF7\u6839\u636E\u4EE5\u4E0A\u95EE\u9898\u9010\u4E00\u4FEE\u590D\u3002`:`Lint \u68C0\u67E5\u5B8C\u6210\uFF0C\u672A\u53D1\u73B0\u660E\u663E\u95EE\u9898\u3002\u77E5\u8BC6\u5E93\u72B6\u6001\u826F\u597D\uFF01

\u5171\u68C0\u67E5 ${c.length} \u4E2A\u6587\u4EF6\u3002`}}catch(t){return{success:!1,content:`Lint \u68C0\u67E5\u5931\u8D25: ${t.message}`}}}}),this.tools.set("get_knowledge_base_status",{name:"get_knowledge_base_status",description:"\u83B7\u53D6\u77E5\u8BC6\u5E93\u5F53\u524D\u72B6\u6001\uFF1A\u6587\u4EF6\u6570\u91CF\u3001\u6210\u719F\u5EA6\u5206\u5E03\u3001\u6700\u8FD1\u66F4\u65B0\u7B49",parameters:{type:"object",properties:{},required:[]},execute:async e=>{try{let t=(0,a.normalizePath)(this.settings.knowledgeBasePath),n=this.app.vault.getAbstractFileByPath(t);if(!n||!(n instanceof a.TFolder))return{success:!1,content:`\u77E5\u8BC6\u5E93\u5C1A\u672A\u521D\u59CB\u5316\u3002\u8DEF\u5F84: ${t}

\u8BF7\u4F7F\u7528 init_knowledge_base \u5DE5\u5177\u521D\u59CB\u5316\u77E5\u8BC6\u5E93\u3002`};let s={},i={"\u{1F7E2}":0,"\u{1F7E1}":0,"\u{1F534}":0},o=r=>{let p=0;for(let h of r.children)h instanceof a.TFile?p++:h instanceof a.TFolder&&(p+=o(h));return p};for(let r of n.children)r instanceof a.TFolder&&(s[r.name]=o(r));let c=`${t}/10-\u77E5\u8BC6\u70B9\u5E93`,l=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(c));if(l&&l instanceof a.TFolder){for(let r of l.children)if(r instanceof a.TFolder){for(let p of r.children)if(p instanceof a.TFile){let h=await this.app.vault.cachedRead(p);h.includes("\u{1F7E2}")?i["\u{1F7E2}"]++:h.includes("\u{1F7E1}")?i["\u{1F7E1}"]++:h.includes("\u{1F534}")&&i["\u{1F534}"]++}}}let u=`${t}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,d=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(u)),m="\u672A\u77E5";return d&&d instanceof a.TFile&&(m=new Date(d.stat.mtime).toLocaleString("zh-CN")),{success:!0,content:`\u{1F4CA} \u77E5\u8BC6\u5E93\u72B6\u6001\u62A5\u544A

\u8DEF\u5F84: ${t}
\u6700\u540E\u66F4\u65B0: ${m}

\u{1F4C1} \u76EE\u5F55\u7EDF\u8BA1:
${Object.entries(s).map(([r,p])=>`  - ${r}: ${p} \u4E2A\u6587\u4EF6`).join(`
`)}

\u{1F4C8} \u6210\u719F\u5EA6\u5206\u5E03:
  - \u{1F7E2} \u5B8C\u6574\u7EA7: ${i["\u{1F7E2}"]}\u4E2A
  - \u{1F7E1} \u57FA\u7840\u7EA7: ${i["\u{1F7E1}"]}\u4E2A
  - \u{1F534} \u6846\u67B6\u7EA7: ${i["\u{1F534}"]}\u4E2A`}}catch(t){return{success:!1,content:`\u83B7\u53D6\u77E5\u8BC6\u5E93\u72B6\u6001\u5931\u8D25: ${t.message}`}}}}),this.tools.set("record_conflict",{name:"record_conflict",description:"\u8BB0\u5F55\u77E5\u8BC6\u70B9\u4E4B\u95F4\u7684\u77DB\u76FE/\u51B2\u7A81",parameters:{type:"object",properties:{old_info:{type:"string",description:"\u65E7\u4FE1\u606F"},new_info:{type:"string",description:"\u65B0\u4FE1\u606F"},old_source:{type:"string",description:"\u65E7\u4FE1\u606F\u6765\u6E90\u8DEF\u5F84"},new_source:{type:"string",description:"\u65B0\u4FE1\u606F\u6765\u6E90\u8DEF\u5F84"},resolution:{type:"string",description:"\u5904\u7406\u65B9\u5F0F",enum:["\u6807\u6CE8\u77DB\u76FE","\u4EE5\u65B0\u4E3A\u51C6","\u9700\u9A8C\u8BC1"]}},required:["old_info","new_info"]},execute:async e=>{try{let n=`${(0,a.normalizePath)(this.settings.knowledgeBasePath)}/30-\u7EF4\u62A4\u8BB0\u5F55/\u51B2\u7A81\u4E0E\u9519\u8BEF\u8BB0\u5F55.md`,s=new Date().toISOString().split("T")[0],i=`
## \u26A0\uFE0F \u77E5\u8BC6\u70B9\u77DB\u76FE\u8BB0\u5F55 (${s})

**\u77DB\u76FE\u5185\u5BB9**\uFF1A
- \u65E7\u4FE1\u606F\uFF1A${e.old_info}
- \u65B0\u4FE1\u606F\uFF1A${e.new_info}

**\u77DB\u76FE\u6765\u6E90**\uFF1A
- \u65E7\uFF1A[[${e.old_source||"\u5F85\u8865\u5145"}]]
- \u65B0\uFF1A[[${e.new_source||"\u5F85\u8865\u5145"}]]

**\u5904\u7406\u65B9\u5F0F**\uFF1A${e.resolution||"\u6807\u6CE8\u77DB\u76FE"}
**\u8BB0\u5F55\u65F6\u95F4**\uFF1A${s}

---
`,o=this.app.vault.getAbstractFileByPath((0,a.normalizePath)(n));if(o&&o instanceof a.TFile){let c=await this.app.vault.read(o);await this.app.vault.modify(o,c+i)}else await this.createFileOnly(n,`# \u51B2\u7A81\u4E0E\u9519\u8BEF\u8BB0\u5F55

${i}`);return{success:!0,content:`\u51B2\u7A81\u5DF2\u8BB0\u5F55\u5230: ${n}`}}catch(t){return{success:!1,content:`\u8BB0\u5F55\u51B2\u7A81\u5931\u8D25: ${t.message}`}}}})}registerMemoryTools(){this.tools.set("save_memory",{name:"save_memory",description:"\u4FDD\u5B58\u957F\u671F\u8BB0\u5FC6\uFF08\u7ECF\u9A8C\u3001\u6D1E\u5BDF\u3001\u65B9\u6CD5\u8BBA\uFF09",parameters:{type:"object",properties:{category:{type:"string",description:"\u8BB0\u5FC6\u5206\u7C7B\uFF0C\u5982\uFF1A\u9009\u9898\u7ECF\u9A8C\u3001\u8BBE\u8BA1\u6280\u5DE7\u3001\u5DE5\u4F5C\u65B9\u6CD5"},content:{type:"string",description:"\u8BB0\u5FC6\u5185\u5BB9"}},required:["category","content"]},execute:async e=>{try{let t=(0,a.normalizePath)(`${this.settings.memoryFolder}/\u957F\u671F\u8BB0\u5FC6.md`),n=this.app.vault.getAbstractFileByPath(t),s=new Date().toISOString().split("T")[0],i=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}),o=`
### [${e.category}] ${s} ${i}
${e.content}
`;if(n&&n instanceof a.TFile){let c=await this.app.vault.read(n);await this.app.vault.modify(n,c+o)}else await this.ensureFolder(this.settings.memoryFolder),await this.createFileOnly(t,`# \u957F\u671F\u8BB0\u5FC6

> Agent \u7684\u957F\u671F\u8BB0\u5FC6\uFF0C\u8BB0\u5F55\u5173\u952E\u7ECF\u9A8C\u3001\u7528\u6237\u504F\u597D\u548C\u8FD0\u8425\u7B56\u7565
${o}`);return{success:!0,content:`\u8BB0\u5FC6\u5DF2\u4FDD\u5B58\u5230: ${t}`}}catch(t){return{success:!1,content:`\u4FDD\u5B58\u8BB0\u5FC6\u5931\u8D25: ${t.message}`}}}}),this.tools.set("save_preference",{name:"save_preference",description:"\u4FDD\u5B58\u7528\u6237\u504F\u597D\uFF08\u98CE\u683C\u504F\u597D\u3001\u4E60\u60EF\u8981\u6C42\u7B49\uFF09",parameters:{type:"object",properties:{key:{type:"string",description:"\u504F\u597D\u952E\u540D\uFF0C\u5982\uFF1A\u5199\u4F5C\u98CE\u683C\u3001\u77E5\u8BC6\u5E93\u5206\u7C7B\u504F\u597D"},value:{type:"string",description:"\u504F\u597D\u503C"}},required:["key","value"]},execute:async e=>{try{let t=(0,a.normalizePath)(`${this.settings.memoryFolder}/\u7528\u6237\u504F\u597D.md`),n=this.app.vault.getAbstractFileByPath(t),s=new Date().toISOString().split("T")[0];if(n&&n instanceof a.TFile){let o=(await this.app.vault.read(n)).split(`
`),c=o.findIndex(l=>l.startsWith(`- **${e.key}**:`));c>=0?o[c]=`- **${e.key}**: ${e.value} (_${s}_)`:o.push(`- **${e.key}**: ${e.value} (_${s}_)`),await this.app.vault.modify(n,o.join(`
`))}else await this.ensureFolder(this.settings.memoryFolder),await this.createFileOnly(t,`# \u7528\u6237\u504F\u597D

> Agent \u8BB0\u5F55\u7684\u7528\u6237\u504F\u597D\u548C\u4E60\u60EF

- **${e.key}**: ${e.value} (_${s}_)
`);return{success:!0,content:`\u504F\u597D\u5DF2\u4FDD\u5B58: ${e.key} = ${e.value}`}}catch(t){return{success:!1,content:`\u4FDD\u5B58\u504F\u597D\u5931\u8D25: ${t.message}`}}}}),this.tools.set("write_log",{name:"write_log",description:"\u5199\u5165\u5DE5\u4F5C\u65E5\u5FD7",parameters:{type:"object",properties:{title:{type:"string",description:"\u65E5\u5FD7\u6807\u9898"},content:{type:"string",description:"\u65E5\u5FD7\u5185\u5BB9"}},required:["title","content"]},execute:async e=>{try{let t=new Date().toISOString().split("T")[0],n=(0,a.normalizePath)(`${this.settings.memoryFolder}/\u65E5\u5FD7/${t}.md`),s=this.app.vault.getAbstractFileByPath(n),i=`
## ${new Date().toLocaleTimeString("zh-CN")} | ${e.title}

${e.content}

---
`;if(s&&s instanceof a.TFile){let o=await this.app.vault.read(s);await this.app.vault.modify(s,o+i)}else await this.ensureFolder(`${this.settings.memoryFolder}/\u65E5\u5FD7`),await this.createFileOnly(n,`# \u5DE5\u4F5C\u65E5\u5FD7 ${t}

${i}`);return{success:!0,content:`\u65E5\u5FD7\u5DF2\u5199\u5165: ${n}`}}catch(t){return{success:!1,content:`\u5199\u5165\u65E5\u5FD7\u5931\u8D25: ${t.message}`}}}}),this.tools.set("read_memory",{name:"read_memory",description:"\u8BFB\u53D6\u957F\u671F\u8BB0\u5FC6\u548C\u7528\u6237\u504F\u597D",parameters:{type:"object",properties:{},required:[]},execute:async e=>{try{let t=[],n=(0,a.normalizePath)(`${this.settings.memoryFolder}/\u957F\u671F\u8BB0\u5FC6.md`),s=this.app.vault.getAbstractFileByPath(n);s&&s instanceof a.TFile&&t.push(await this.app.vault.read(s));let i=(0,a.normalizePath)(`${this.settings.memoryFolder}/\u7528\u6237\u504F\u597D.md`),o=this.app.vault.getAbstractFileByPath(i);return o&&o instanceof a.TFile&&t.push(await this.app.vault.read(o)),{success:!0,content:t.length>0?t.join(`

---

`):"\u6682\u65E0\u8BB0\u5FC6\u8BB0\u5F55"}}catch(t){return{success:!1,content:`\u8BFB\u53D6\u8BB0\u5FC6\u5931\u8D25: ${t.message}`}}}})}getToolDefinitions(){let e=[];for(let[,t]of this.tools)e.push({type:"function",function:{name:t.name,description:t.description,parameters:t.parameters}});return e}async executeTool(e,t){let n=this.tools.get(e);return n?await n.execute(t):{success:!1,content:`\u672A\u77E5\u5DE5\u5177: ${e}`}}async ensureFolder(e){if(!e)return;let t=(0,a.normalizePath)(e).split("/"),n="";for(let s of t)n=n?`${n}/${s}`:s,this.app.vault.getAbstractFileByPath(n)||await this.app.vault.createFolder(n)}async createFileOnly(e,t){let n=(0,a.normalizePath)(e);if(this.isUnderRawMaterials(n))return;let i=this.app.vault.getAbstractFileByPath(n);i&&i instanceof a.TFile||await this.app.vault.create(n,t)}isUnderRawMaterials(e){let t=(0,a.normalizePath)(this.settings.knowledgeBasePath),n=(0,a.normalizePath)(e),s=`${t}/00-\u539F\u59CB\u8D44\u6599`;return n===s||n.startsWith(s+"/")?n:null}};var P=require("obsidian"),M="llm-wiki-chat-view",j=class extends P.ItemView{constructor(t,n){super(t);this.isProcessing=!1;this.currentAssistantEl=null;this.currentContent="";this.renderTimer=null;this.tokenBuffer="";this.toolCardEl=null;this.plugin=n}getViewType(){return M}getDisplayText(){return"LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B"}getIcon(){return"message-square"}async onOpen(){let t=this.containerEl.children[1];t.empty(),t.addClass("llm-wiki-root"),this.buildUI(t),await this.loadChatHistory()}onClose(){this.saveChatHistory()}buildUI(t){let n=t.createEl("div",{cls:"llm-wiki-chat-header"});n.createEl("h3",{text:"\u{1F4AC} LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B"}),n.createEl("div",{cls:"llm-wiki-header-actions"}).createEl("button",{text:"\u65B0\u5BF9\u8BDD",cls:"llm-wiki-btn"}).addEventListener("click",()=>void this.newConversation()),this.messagesEl=t.createEl("div",{cls:"llm-wiki-messages"});let o=t.createEl("div",{cls:"llm-wiki-input-container"});this.inputEl=o.createEl("textarea",{cls:"llm-wiki-input",attr:{placeholder:"\u8F93\u5165\u60A8\u7684\u95EE\u9898...",rows:"2"}}),this.inputEl.addEventListener("keydown",d=>{d.key==="Enter"&&!d.shiftKey&&(d.preventDefault(),this.sendMessage())});let c=o.createEl("div",{cls:"llm-wiki-hints"}),l=[{text:"\u521D\u59CB\u5316\u77E5\u8BC6\u5E93",tip:"\u521B\u5EFA\u4E13\u9898\u77E5\u8BC6\u5E93\u76EE\u5F55\u7ED3\u6784"},{text:"\u6444\u53D6\u8D44\u6599",tip:"\u5904\u7406\u539F\u59CB\u8D44\u6599\u6587\u4EF6"},{text:"\u67E5\u8BE2\u77E5\u8BC6",tip:"\u641C\u7D22\u77E5\u8BC6\u5E93\u5185\u5BB9"},{text:"Lint \u68C0\u67E5",tip:"\u6267\u884C\u6574\u7406\u68C0\u67E5"},{text:"\u77E5\u8BC6\u5E93\u72B6\u6001",tip:"\u67E5\u770B\u77E5\u8BC6\u5E93\u6982\u51B5"}];for(let d of l)c.createEl("span",{cls:"llm-wiki-hint-chip",text:d.text,attr:{title:d.tip}}).addEventListener("click",()=>{this.inputEl.value=d.text,this.inputEl.focus()});let u=o.createEl("div",{cls:"llm-wiki-btn-row"});this.sendBtn=u.createEl("button",{text:"\u53D1\u9001",cls:"llm-wiki-btn llm-wiki-btn-primary"}),this.sendBtn.addEventListener("click",()=>void this.sendMessage()),this.stopBtn=u.createEl("button",{text:"\u505C\u6B62",cls:"llm-wiki-btn llm-wiki-btn-danger"}),this.stopBtn.addClass("llm-wiki-hidden"),this.stopBtn.addEventListener("click",()=>this.stopGeneration())}async newConversation(){var t;this.isProcessing||((t=this.plugin.agentCore)==null||t.clearHistory(),this.messagesEl.empty(),this.currentContent="",this.tokenBuffer="",this.addSystemMessage(`\u65B0\u5BF9\u8BDD\u5DF2\u5F00\u59CB\u3002\u60A8\u53EF\u4EE5\u8F93\u5165\u95EE\u9898\uFF0C\u6216\u5C1D\u8BD5\u4EE5\u4E0B\u6307\u4EE4\uFF1A

\u2022 **'\u521D\u59CB\u5316\u77E5\u8BC6\u5E93'** - \u521B\u5EFA\u4E13\u9898\u77E5\u8BC6\u5E93\u76EE\u5F55\u7ED3\u6784
\u2022 **'\u6444\u53D6'** - \u5904\u7406\u539F\u59CB\u8D44\u6599
\u2022 **'\u67E5\u8BE2'** - \u641C\u7D22\u77E5\u8BC6\u5E93
\u2022 **'Lint'** - \u6267\u884C\u6574\u7406\u68C0\u67E5
\u2022 **'\u521B\u5EFA\u77E5\u8BC6\u70B9'** - \u65B0\u5EFA\u77E5\u8BC6\u70B9\u9875\u9762
\u2022 **'\u77E5\u8BC6\u5E93\u72B6\u6001'** - \u67E5\u770B\u77E5\u8BC6\u5E93\u6982\u51B5`))}async sendMessage(){let t=this.inputEl.value.trim();if(!(!t||this.isProcessing)){this.inputEl.value="",this.isProcessing=!0,this.sendBtn.addClass("llm-wiki-hidden"),this.stopBtn.removeClass("llm-wiki-hidden"),this.addUserMessage(t),this.addAssistantMessage("");try{let n=this.plugin.agentCore;if(!n){this.updateAssistantMessage("\u274C Agent \u672A\u521D\u59CB\u5316\uFF0C\u8BF7\u68C0\u67E5 API Key \u8BBE\u7F6E\u3002");return}let s=async i=>{this.finalizeAssistantMessage(),this.autoLog(t,i),await this.saveChatHistory()};this.plugin.settings.streamMode?await n.chatStream(t,{onToken:i=>this.appendToken(i),onToolCall:(i,o)=>this.showToolCall(i,o),onToolResult:(i,o)=>this.showToolResult(i,o),onComplete:s,onError:i=>{this.updateAssistantMessage(`\u274C ${i}`),this.finalizeAssistantMessage()}}):await n.chatNonStream(t,{onToken:i=>this.appendToken(i),onToolCall:(i,o)=>this.showToolCall(i,o),onToolResult:(i,o)=>this.showToolResult(i,o),onComplete:s,onError:i=>{this.updateAssistantMessage(`\u274C ${i}`),this.finalizeAssistantMessage()}})}catch(n){this.updateAssistantMessage(`\u274C \u53D1\u751F\u9519\u8BEF: ${n instanceof Error?n.message:String(n)}`)}finally{this.isProcessing=!1,this.sendBtn.removeClass("llm-wiki-hidden"),this.stopBtn.addClass("llm-wiki-hidden"),this.toolCardEl=null,this.inputEl.focus()}}}stopGeneration(){var t;(t=this.plugin.agentCore)==null||t.abort(),this.isProcessing=!1,this.sendBtn.removeClass("llm-wiki-hidden"),this.stopBtn.addClass("llm-wiki-hidden")}async addUserMessage(t){let n=this.messagesEl.createEl("div",{cls:"llm-wiki-message llm-wiki-user-message"});n.createEl("div",{cls:"llm-wiki-message-sender",text:"\u4F60"});let s=n.createEl("div",{cls:"llm-wiki-message-content"});await P.MarkdownRenderer.render(this.app,t,s,"",this.plugin),this.scrollToBottom()}addSystemMessage(t){let s=this.messagesEl.createEl("div",{cls:"llm-wiki-message llm-wiki-system-message"}).createEl("div",{cls:"llm-wiki-message-content"});P.MarkdownRenderer.render(this.app,t,s,"",this.plugin)}addAssistantMessage(t){let n=this.messagesEl.createEl("div",{cls:"llm-wiki-message llm-wiki-assistant-message"});n.createEl("div",{cls:"llm-wiki-message-sender",text:"Agent"}),this.currentAssistantEl=n.createEl("div",{cls:"llm-wiki-message-content"}),this.currentContent=t,this.tokenBuffer=""}updateAssistantMessage(t){this.currentAssistantEl&&(this.currentContent=t,this.currentAssistantEl.empty(),P.MarkdownRenderer.render(this.app,t,this.currentAssistantEl,"",this.plugin),this.scrollToBottom())}appendToken(t){this.currentContent+=t,this.tokenBuffer+=t,this.renderTimer||(this.renderTimer=window.setInterval(()=>this.flushTokenBuffer(),50)),this.scrollToBottom()}flushTokenBuffer(){this.renderTimer&&(window.clearInterval(this.renderTimer),this.renderTimer=null),this.tokenBuffer&&this.currentAssistantEl&&(this.currentAssistantEl.empty(),P.MarkdownRenderer.render(this.app,this.currentContent,this.currentAssistantEl,"",this.plugin),this.tokenBuffer="")}finalizeAssistantMessage(){this.flushTokenBuffer(),this.currentAssistantEl=null,this.currentContent=""}showToolCall(t,n){let s=JSON.stringify(n,null,2);if(this.currentAssistantEl){let i=this.currentAssistantEl.createEl("div",{cls:"llm-wiki-tool-card llm-wiki-tool-running"});i.createEl("div",{cls:"llm-wiki-tool-name",text:`\u{1F7E1} \u8C03\u7528\u5DE5\u5177: ${t}`});let o=i.createEl("pre",{cls:"llm-wiki-tool-args"});o.textContent=s,this.toolCardEl=i}this.scrollToBottom()}showToolResult(t,n){if(this.toolCardEl){let s=n.success?`\u{1F7E2} ${t} \u5B8C\u6210`:`\u{1F534} ${t} \u5931\u8D25`,i=this.toolCardEl.querySelector(".llm-wiki-tool-name");if(i&&(i.textContent=s),this.toolCardEl.removeClass("llm-wiki-tool-running"),this.toolCardEl.addClass(n.success?"llm-wiki-tool-success":"llm-wiki-tool-error"),n.content){let o=this.toolCardEl.createEl("div",{cls:"llm-wiki-tool-result"});o.textContent=n.content.length>300?n.content.substring(0,300)+"...":n.content}this.toolCardEl=null}this.scrollToBottom()}scrollToBottom(){this.messagesEl.scrollTop=this.messagesEl.scrollHeight}async autoLog(t,n){if(!(!this.plugin.settings.autoLog||!this.plugin.memoryService))try{let s=t.length>50?t.substring(0,50)+"...":t,i=n.length>200?n.substring(0,200)+"...":n;await this.plugin.memoryService.writeLog(s,`\u7528\u6237: ${t}`,i)}catch(s){}}async saveChatHistory(){var t;try{let n=(t=this.plugin.agentCore)==null?void 0:t.getHistory();if(!n||n.length===0)return;let s={messages:n,savedAt:new Date().toISOString()},i=(0,P.normalizePath)(`${this.plugin.settings.memoryFolder}/\u5BF9\u8BDD\u5386\u53F2.json`),o=this.app.vault.getAbstractFileByPath(i);o&&o instanceof P.TFile?await this.app.vault.modify(o,JSON.stringify(s,null,2)):await this.app.vault.create(i,JSON.stringify(s,null,2))}catch(n){}}async loadChatHistory(){var t;try{let n=(0,P.normalizePath)(`${this.plugin.settings.memoryFolder}/\u5BF9\u8BDD\u5386\u53F2.json`),s=this.app.vault.getAbstractFileByPath(n);if(!s||!(s instanceof P.TFile)){this.addSystemMessage(`\u6B22\u8FCE\u4F7F\u7528 LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B\uFF01

\u8BF7\u5148\u5B8C\u6210\u4EE5\u4E0B\u8BBE\u7F6E\uFF1A
1. \u5728\u8BBE\u7F6E\u4E2D\u586B\u5199 API Key\uFF08\u652F\u6301 OpenAI / DeepSeek / \u7845\u57FA\u6D41\u52A8\u7B49\uFF09
2. \u8BBE\u7F6E\u77E5\u8BC6\u5E93\u8DEF\u5F84

\u7136\u540E\u5C31\u53EF\u4EE5\u5F00\u59CB\u5BF9\u8BDD\u4E86\uFF01`);return}let i=await this.app.vault.read(s),o=JSON.parse(i);(t=this.plugin.agentCore)==null||t.setHistory(o.messages||[]);for(let c of o.messages||[])c.role==="user"?this.addUserMessage(c.content):c.role==="assistant"&&!c.tool_calls&&(this.addAssistantMessage(c.content),this.finalizeAssistantMessage())}catch(n){this.addSystemMessage("\u6B22\u8FCE\u56DE\u6765\uFF01\u4E0A\u6B21\u7684\u5BF9\u8BDD\u5386\u53F2\u52A0\u8F7D\u5931\u8D25\uFF0C\u5DF2\u5F00\u542F\u65B0\u5BF9\u8BDD\u3002")}}};var C=require("obsidian"),R=class{constructor(e,t){this.app=e,this.settings=t}updateSettings(e){this.settings=e}async loadSkillContent(){try{let e=(0,C.normalizePath)(`${this.settings.skillFolderPath}/SKILL.md`),t=this.app.vault.getAbstractFileByPath(e);if(t&&t instanceof C.TFile)return await this.app.vault.read(t)}catch(e){}return""}async loadReferencesContent(){try{let e=[],t=(0,C.normalizePath)(`${this.settings.skillFolderPath}/references`),n=this.app.vault.getAbstractFileByPath(t);if(n&&n instanceof C.TFolder){for(let s of n.children)if(s instanceof C.TFile&&s.extension==="md"){let i=await this.app.vault.read(s);e.push(`### ${s.name}

${i}`)}}return e.join(`

---

`)}catch(e){}return""}async loadMemoryContext(){let e=[],t=(0,C.normalizePath)(`${this.settings.memoryFolder}/\u957F\u671F\u8BB0\u5FC6.md`),n=this.app.vault.getAbstractFileByPath(t);n&&n instanceof C.TFile&&e.push(await this.app.vault.read(n));let s=(0,C.normalizePath)(`${this.settings.memoryFolder}/\u7528\u6237\u504F\u597D.md`),i=this.app.vault.getAbstractFileByPath(s);return i&&i instanceof C.TFile&&e.push(await this.app.vault.read(i)),e.join(`

---

`)}async writeLog(e,t,n){let s=new Date().toISOString().split("T")[0],i=(0,C.normalizePath)(`${this.settings.memoryFolder}/\u65E5\u5FD7/${s}.md`),o=`## ${new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})} | ${e}

${t}

\u6458\u8981: ${n}

---
`,c=this.app.vault.getAbstractFileByPath(i);if(c&&c instanceof C.TFile){let l=await this.app.vault.read(c);await this.app.vault.modify(c,l+o)}else await this.ensureFolder(`${this.settings.memoryFolder}/\u65E5\u5FD7`),await this.app.vault.create(i,`# \u5DE5\u4F5C\u65E5\u5FD7 ${s}

${o}`)}async ensureFolder(e){if(!e)return;let t=(0,C.normalizePath)(e).split("/"),n="";for(let s of t)n=n?`${n}/${s}`:s,this.app.vault.getAbstractFileByPath(n)||await this.app.vault.createFolder(n)}};var D=class{constructor(){this.summaryCache=new Map;this.maxTokens=8e3}setMaxTokens(e){this.maxTokens=e}estimateTokens(e){return Math.ceil(e.length/2)}async compressHistory(e,t){let n=e.map(r=>r.content||"").join(`
`);if(this.estimateTokens(n)<=this.maxTokens)return e;let s=[],i=[];for(let r of e)i.push(r),r.role==="assistant"&&!r.tool_calls&&(s.push([...i]),i=[]);if(i.length>0&&s.push(i),s.length<=6)return e;let o=s.slice(-6),l=s.slice(0,-6).flat().map(r=>`${r.role}: ${r.content||""}`).join(`
`),u=this.hashText(l),d=this.summaryCache.get(u);if(!d)try{d=await t([{role:"system",content:"\u5C06\u4EE5\u4E0B\u5BF9\u8BDD\u5386\u53F2\u538B\u7F29\u4E3A\u4E00\u6BB5\u7B80\u6D01\u7684\u6458\u8981\uFF0C\u4FDD\u7559\u5173\u952E\u4FE1\u606F\u3001\u51B3\u7B56\u548C\u7ED3\u8BBA\uFF0C\u4E0D\u8D85\u8FC7500\u5B57\u3002\u5982\u679C\u6D89\u53CA\u77E5\u8BC6\u70B9\u5E93\u7684\u64CD\u4F5C\uFF0C\u4FDD\u7559\u6587\u4EF6\u8DEF\u5F84\u548C\u64CD\u4F5C\u7C7B\u578B\u3002"},{role:"user",content:l}]),this.summaryCache.set(u,d)}catch(r){d=`[\u65E9\u671F\u5BF9\u8BDD\u6458\u8981: ${l.substring(0,500)}...]`}return[{role:"assistant",content:`[\u5386\u53F2\u5BF9\u8BDD\u6458\u8981]
${d}`},...o.flat()]}hashText(e){let t=0;for(let n=0;n<e.length;n++){let s=e.charCodeAt(n);t=(t<<5)-t+s,t|=0}return`ctx_${t.toString(36)}`}getSummaryStats(e){let t=e.map(n=>n.content||"").join(`
`);return{originalTokens:this.estimateTokens(t),compressedTokens:Math.ceil(t.length/3),turns:e.filter(n=>n.role==="user").length}}};var q=class extends U.Plugin{async onload(){await this.loadSettings(),this.addSettingTab(new B(this.app,this)),this.toolRegistry=new I(this.app,this.settings),this.memoryService=new R(this.app,this.settings),this.contextManager=new D,await this.initAgent(),this.registerView(M,t=>new j(t,this)),this.addCommand({id:"open-llm-wiki-chat",name:"\u6253\u5F00 LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B",callback:()=>this.activateChatView()}),this.addRibbonIcon("message-square","LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B",()=>{this.activateChatView()}),this.applyTheme(),this.app.workspace.onLayoutReady(()=>{this.activateChatView()})}onunload(){}async initAgent(){let[t,n,s]=await Promise.all([this.memoryService.loadSkillContent(),this.memoryService.loadReferencesContent(),this.memoryService.loadMemoryContext()]);this.agentCore=new O(this.settings,this.toolRegistry),this.agentCore.init(t,n,s)}async activateChatView(){let{workspace:t}=this.app,n=t.getLeavesOfType(M)[0];if(!n){let s=t.getRightLeaf(!1);s&&(await s.setViewState({type:M,active:!0}),n=t.getLeavesOfType(M)[0])}n&&t.revealLeaf(n)}applyTheme(){document.body.classList.remove("llm-wiki-theme-dark-blue","llm-wiki-theme-warm-light","llm-wiki-theme-obsidian-red","llm-wiki-theme-lavender","llm-wiki-theme-forest-green"),document.body.classList.add(`llm-wiki-theme-${this.settings.theme}`)}async loadSettings(){this.settings=Object.assign({},z,await this.loadData())}async saveSettings(){await this.saveData(this.settings),await this.initAgent(),this.memoryService.updateSettings(this.settings)}};
