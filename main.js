var W=Object.defineProperty;var Y=Object.getOwnPropertyDescriptor;var Q=Object.getOwnPropertyNames;var X=Object.prototype.hasOwnProperty;var Z=($,i)=>{for(var t in i)W($,t,{get:i[t],enumerable:!0})},tt=($,i,t,e)=>{if(i&&typeof i=="object"||typeof i=="function")for(let n of Q(i))!X.call($,n)&&n!==t&&W($,n,{get:()=>i[n],enumerable:!(e=Y(i,n))||e.enumerable});return $};var et=$=>tt(W({},"__esModule",{value:!0}),$);var nt={};Z(nt,{default:()=>R});module.exports=et(nt);var D=require("obsidian");var _=require("obsidian"),H={apiKey:"",apiBaseUrl:"https://api.openai.com/v1",modelName:"gpt-4o",knowledgeBasePath:"\u77E5\u8BC6\u5E93",memoryFolder:"\u8BB0\u5FC6",skillFolderPath:"\u77E5\u8BC6\u5E93",theme:"dark-blue",temperature:.7,maxIterations:15,autoLog:!0,streamMode:!0},L=class extends _.PluginSettingTab{constructor(t,e){super(t,e);this.plugin=e;let n=(0,_.debounce)(async()=>{await this.plugin.saveSettings()},500,!0);this.debouncedSave=()=>{n()}}display(){let{containerEl:t}=this;t.empty(),new _.Setting(t).setName("LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B\u8BBE\u7F6E").setHeading(),new _.Setting(t).setName("API Key").setDesc("OpenAI \u517C\u5BB9 API \u5BC6\u94A5").addText(e=>{e.setPlaceholder("sk-...").setValue(this.plugin.settings.apiKey).onChange(async s=>{this.plugin.settings.apiKey=s,this.debouncedSave()});let n=e.inputEl;n.type="password"}),new _.Setting(t).setName("API Base URL").setDesc("OpenAI \u517C\u5BB9 API \u5730\u5740").addText(e=>e.setPlaceholder("https://api.openai.com/v1").setValue(this.plugin.settings.apiBaseUrl).onChange(async n=>{this.plugin.settings.apiBaseUrl=n,this.debouncedSave()})),new _.Setting(t).setName("\u6A21\u578B\u540D\u79F0").setDesc("\u4F7F\u7528\u7684\u6A21\u578B\uFF0C\u5982 gpt-4o\u3001deepseek-chat \u7B49").addText(e=>e.setPlaceholder("gpt-4o").setValue(this.plugin.settings.modelName).onChange(async n=>{this.plugin.settings.modelName=n,this.debouncedSave()})),new _.Setting(t).setName("\u77E5\u8BC6\u5E93\u8DEF\u5F84").setDesc("\u77E5\u8BC6\u5E93\u5728 Vault \u4E2D\u7684\u6839\u8DEF\u5F84").addText(e=>e.setPlaceholder("\u77E5\u8BC6\u5E93").setValue(this.plugin.settings.knowledgeBasePath).onChange(async n=>{this.plugin.settings.knowledgeBasePath=n,this.debouncedSave()})),new _.Setting(t).setName("Skill \u6587\u4EF6\u5939\u8DEF\u5F84").setDesc("\u5305\u542B SKILL.md \u548C references/ \u5B50\u6587\u4EF6\u5939\u7684\u76EE\u5F55\u8DEF\u5F84\uFF08\u4ECE vault \u6839\u76EE\u5F55\u5F00\u59CB\uFF09").addText(e=>e.setPlaceholder("\u77E5\u8BC6\u5E93").setValue(this.plugin.settings.skillFolderPath).onChange(async n=>{this.plugin.settings.skillFolderPath=n,this.debouncedSave()})),new _.Setting(t).setName("\u8BB0\u5FC6\u6587\u4EF6\u5939\u8DEF\u5F84").setDesc("Agent \u8BB0\u5FC6\u5B58\u50A8\u8DEF\u5F84").addText(e=>e.setPlaceholder("\u8BB0\u5FC6").setValue(this.plugin.settings.memoryFolder).onChange(async n=>{this.plugin.settings.memoryFolder=n,this.debouncedSave()})),new _.Setting(t).setName("\u4E3B\u9898").setDesc("\u754C\u9762\u4E3B\u9898\u98CE\u683C").addDropdown(e=>e.addOptions({"dark-blue":"\u6697\u591C\u84DD","warm-light":"\u6696\u767D","obsidian-red":"Obsidian \u7EA2",lavender:"\u85B0\u8863\u8349\u7D2B","forest-green":"\u58A8\u7EFF"}).setValue(this.plugin.settings.theme).onChange(async n=>{this.plugin.settings.theme=n,await this.plugin.saveSettings(),this.plugin.applyTheme()})),new _.Setting(t).setName("Temperature").setDesc("LLM \u751F\u6210\u6E29\u5EA6 (0-2)").addSlider(e=>e.setLimits(0,2,.1).setValue(this.plugin.settings.temperature).onChange(async n=>{this.plugin.settings.temperature=n,this.debouncedSave()})),new _.Setting(t).setName("\u6700\u5927\u8FED\u4EE3\u6B21\u6570").setDesc("Agent \u5DE5\u5177\u8C03\u7528\u6700\u5927\u8FED\u4EE3\u6B21\u6570").addSlider(e=>e.setLimits(1,30,1).setValue(this.plugin.settings.maxIterations).onChange(async n=>{this.plugin.settings.maxIterations=n,this.debouncedSave()})),new _.Setting(t).setName("\u6D41\u5F0F\u8F93\u51FA").setDesc("\u542F\u7528\u6D41\u5F0F\u8F93\u51FA\uFF08\u5B9E\u65F6\u663E\u793A\u56DE\u590D\uFF09").addToggle(e=>e.setValue(this.plugin.settings.streamMode).onChange(async n=>{this.plugin.settings.streamMode=n,await this.plugin.saveSettings()})),new _.Setting(t).setName("\u81EA\u52A8\u65E5\u5FD7").setDesc("\u5BF9\u8BDD\u5B8C\u6210\u540E\u81EA\u52A8\u8BB0\u5F55\u5DE5\u4F5C\u65E5\u5FD7").addToggle(e=>e.setValue(this.plugin.settings.autoLog).onChange(async n=>{this.plugin.settings.autoLog=n,await this.plugin.saveSettings()}))}};var V=require("obsidian");function K($,i,t,e=""){let n=[],s=`\u4F60\u662F\u4E00\u4E2A\u77E5\u8BC6\u5E93\u6784\u5EFA\u4E0E\u7EF4\u62A4\u52A9\u624B\u3002\u4F60\u7684\u5DE5\u4F5C\u89C4\u8303\u3001\u539F\u5219\u3001\u5DE5\u4F5C\u6D41\u3001\u8D28\u91CF\u63A7\u5236\u6807\u51C6\u3001\u9875\u9762\u6A21\u677F\u7B49\u5168\u90E8\u5B9A\u4E49\u5728\u4E0B\u65B9\u300C\u77E5\u8BC6\u5E93\u6784\u5EFA\u89C4\u8303\u300D\u4E2D\u3002

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
8. \u6BCF\u6B21\u5DE5\u4F5C\u6D41\u5B8C\u6210\u540E\uFF0C\u5FC5\u987B\u7528\u4E2D\u6587\u5411\u7528\u6237\u603B\u7ED3\u672C\u6B21\u5B8C\u6210\u4E86\u4EC0\u4E48\u3001\u521B\u5EFA\u4E86\u4EC0\u4E48\u3001\u66F4\u65B0\u4E86\u4EC0\u4E48`;return n.push(s),i.trim()&&n.push(`# \u{1F4D6} \u77E5\u8BC6\u5E93\u6784\u5EFA\u89C4\u8303\uFF08\u5B8C\u6574\u7248\uFF09

${i}`),t.trim()&&n.push(`

# \u{1F4CB} \u53C2\u8003\u6A21\u677F

${t}`),e.trim()&&n.push(`

# \u{1F9E0} \u6211\u7684\u8BB0\u5FC6\uFF08\u81EA\u52A8\u52A0\u8F7D\uFF09

${e}`),n.join(`

---

`)}var F=class{constructor(i,t){this.history=[];this.systemPrompt="";this.settings=i,this.toolRegistry=t}init(i="",t="",e=""){this.systemPrompt=K(this.settings,i,t,e),this.history=[]}setHistory(i){this.history=i}getHistory(){return this.history}clearHistory(){this.history=[]}updateSettings(i){this.settings=i,this.toolRegistry.updateSettings(i)}abort(){}async chatStream(i,t){this.history.push({role:"user",content:i});let e="",n=0,s=this.settings.maxIterations||15;for(;n<s;){n++;let c=[{role:"system",content:this.systemPrompt},...this.history];try{let a=await this.streamCompletion(c,t);if(e=a.content,a.toolCalls.length===0){this.history.push({role:"assistant",content:a.content}),t.onComplete(e);return}this.history.push({role:"assistant",content:a.content||"",tool_calls:a.toolCalls});for(let p of a.toolCalls){let l={};try{let g=JSON.parse(p.function.arguments);l=typeof g=="object"&&g!==null&&!Array.isArray(g)?g:{}}catch(g){l={}}t.onToolCall(p.function.name,l);let u=await this.toolRegistry.executeTool(p.function.name,l);t.onToolResult(p.function.name,u),this.history.push({role:"tool",content:u.content,tool_call_id:p.id,name:p.function.name})}}catch(a){if(a instanceof Error&&a.name==="AbortError"){t.onComplete(e);return}let p=`\u8BF7\u6C42\u5931\u8D25: ${a instanceof Error?a.message:String(a)}`;this.history.push({role:"assistant",content:p}),t.onError(p);return}}let o=`\u5DF2\u8FBE\u5230\u6700\u5927\u8FED\u4EE3\u6B21\u6570(${s})\uFF0C\u8BF7\u7B80\u5316\u95EE\u9898\u6216\u5206\u6B65\u6267\u884C\u3002`;this.history.push({role:"assistant",content:o}),t.onComplete(o)}async streamCompletion(i,t){var u;let e=`${this.settings.apiBaseUrl}/chat/completions`,n={model:this.settings.modelName,messages:i.map(g=>({role:g.role,content:g.content||null,tool_calls:g.tool_calls,tool_call_id:g.tool_call_id,name:g.name})),tools:this.toolRegistry.getToolDefinitions(),tool_choice:"auto",temperature:this.settings.temperature,stream:!1},c=(u=(await(0,V.requestUrl)({url:e,method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.settings.apiKey}`},body:JSON.stringify(n)})).json.choices)==null?void 0:u[0];if(!c)throw new Error("API \u8FD4\u56DE\u4E3A\u7A7A");let a=c.message,p=a.content||"",l=a.tool_calls||[];return p&&t.onToken(p),{content:p,toolCalls:l}}async chatNonStream(i,t){this.history.push({role:"user",content:i});let e="",n=0,s=this.settings.maxIterations||15;for(;n<s;){n++;let c=[{role:"system",content:this.systemPrompt},...this.history];try{let a=await this.nonStreamCompletion(c),p=a.content;if(a.toolCalls.length===0){t.onToken(p),this.history.push({role:"assistant",content:p}),e=p,t.onComplete(e);return}this.history.push({role:"assistant",content:p||"",tool_calls:a.toolCalls});for(let l of a.toolCalls){let u={};try{let h=JSON.parse(l.function.arguments);u=typeof h=="object"&&h!==null&&!Array.isArray(h)?h:{}}catch(h){u={}}t.onToolCall(l.function.name,u);let g=await this.toolRegistry.executeTool(l.function.name,u);t.onToolResult(l.function.name,g),this.history.push({role:"tool",content:g.content,tool_call_id:l.id,name:l.function.name})}}catch(a){let p=`\u8BF7\u6C42\u5931\u8D25: ${a instanceof Error?a.message:String(a)}`;this.history.push({role:"assistant",content:p}),t.onError(p);return}}let o=`\u5DF2\u8FBE\u5230\u6700\u5927\u8FED\u4EE3\u6B21\u6570(${s})`;this.history.push({role:"assistant",content:o}),t.onComplete(o)}async nonStreamCompletion(i){var s;let t=`${this.settings.apiBaseUrl}/chat/completions`,e={model:this.settings.modelName,messages:i.map(o=>({role:o.role,content:o.content||null,tool_calls:o.tool_calls,tool_call_id:o.tool_call_id,name:o.name})),tools:this.toolRegistry.getToolDefinitions(),tool_choice:"auto",temperature:this.settings.temperature,stream:!1},n=2;for(let o=0;o<=n;o++)try{let p=(s=(await(0,V.requestUrl)({url:t,method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.settings.apiKey}`},body:JSON.stringify(e)})).json.choices)==null?void 0:s[0];if(!p)throw new Error("API \u8FD4\u56DE\u4E3A\u7A7A");let l=p.message;return{content:l.content||"",toolCalls:l.tool_calls||[]}}catch(c){let a=typeof c=="object"&&c!==null&&"status"in c?c.status:0;if(a>=400&&a<500)throw c;if(o<n)await new Promise(p=>window.setTimeout(p,1e3*(o+1)));else throw c}throw new Error("API \u8C03\u7528\u5931\u8D25\uFF08\u5DF2\u91CD\u8BD5\uFF09")}};var r=require("obsidian"),B=class{constructor(i,t){this.tools=new Map;this.app=i,this.settings=t,this.registerAllTools()}getErrorMessage(i){return i instanceof Error?i.message:String(i)}strArgs(i){let t={};for(let[e,n]of Object.entries(i))typeof n=="string"&&(t[e]=n);return t}updateSettings(i){this.settings=i}registerAllTools(){this.registerVaultTools(),this.registerSkillTools(),this.registerMemoryTools()}registerVaultTools(){this.tools.set("read_vault_file",{name:"read_vault_file",description:"\u8BFB\u53D6 Vault \u4E2D\u7684\u6587\u4EF6\u5185\u5BB9",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84"}},required:["path"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(t.path),n=this.app.vault.getAbstractFileByPath(e);return!n||!(n instanceof r.TFile)?{success:!1,content:`\u6587\u4EF6\u4E0D\u5B58\u5728: ${e}`}:{success:!0,content:await this.app.vault.read(n)}}catch(t){return{success:!1,content:`\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("write_vault_file",{name:"write_vault_file",description:"\u521B\u5EFA\u65B0\u6587\u4EF6\uFF08\u4E0D\u80FD\u5199\u5165 00-\u539F\u59CB\u8D44\u6599/ \u76EE\u5F55\u3002\u5982\u679C\u6587\u4EF6\u5DF2\u5B58\u5728\u5219\u62A5\u9519\uFF09",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84\uFF08\u5FC5\u987B\u662F\u4E0D\u5B58\u5728\u7684\u8DEF\u5F84\uFF0C\u4E14\u4E0D\u80FD\u5728 00-\u539F\u59CB\u8D44\u6599/ \u4E0B\uFF09"},content:{type:"string",description:"\u6587\u4EF6\u5185\u5BB9"}},required:["path","content"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(t.path),n=this.isUnderRawMaterials(e);if(n)return{success:!1,content:`\u7981\u6B62\u5199\u5165\u539F\u59CB\u8D44\u6599\u76EE\u5F55\uFF1A${n}\u300200-\u539F\u59CB\u8D44\u6599/ \u76EE\u5F55\u53EA\u8BFB\uFF0C\u4E0D\u80FD\u4FEE\u6539\u3002\u5982\u679C\u7528\u6237\u9700\u8981\u79FB\u52A8\u6587\u4EF6\uFF0C\u8BF7\u544A\u77E5\u7528\u6237\u624B\u52A8\u64CD\u4F5C\u3002`};let s=this.app.vault.getAbstractFileByPath(e);return s&&s instanceof r.TFile?{success:!1,content:`\u6587\u4EF6\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${e}\u3002\u8BF7\u4F7F\u7528 append_vault_file \u8FFD\u52A0\u5185\u5BB9\uFF0C\u6216\u4F7F\u7528 update_knowledge_page \u66F4\u65B0\u9875\u9762\u7AE0\u8282\u3002`}:(await this.ensureFolder(e.substring(0,e.lastIndexOf("/"))),await this.app.vault.create(e,t.content),{success:!0,content:`\u6587\u4EF6\u5DF2\u521B\u5EFA: ${e}`})}catch(t){return{success:!1,content:`\u521B\u5EFA\u6587\u4EF6\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("append_vault_file",{name:"append_vault_file",description:"\u5728 Vault \u6587\u4EF6\u672B\u5C3E\u8FFD\u52A0\u5185\u5BB9\uFF08\u4E0D\u80FD\u4FEE\u6539 00-\u539F\u59CB\u8D44\u6599/ \u76EE\u5F55\u4E0B\u7684\u6587\u4EF6\uFF09",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84"},content:{type:"string",description:"\u8981\u8FFD\u52A0\u7684\u5185\u5BB9"}},required:["path","content"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(t.path),n=this.isUnderRawMaterials(e);if(n)return{success:!1,content:`\u7981\u6B62\u4FEE\u6539\u539F\u59CB\u8D44\u6599\u76EE\u5F55\uFF1A${n}\u300200-\u539F\u59CB\u8D44\u6599/ \u76EE\u5F55\u53EA\u8BFB\u3002`};let s=this.app.vault.getAbstractFileByPath(e);if(!s||!(s instanceof r.TFile))return{success:!1,content:`\u6587\u4EF6\u4E0D\u5B58\u5728: ${e}`};let o=await this.app.vault.read(s);return await this.app.vault.modify(s,o+`
`+t.content),{success:!0,content:`\u5185\u5BB9\u5DF2\u8FFD\u52A0\u5230: ${e}`}}catch(t){return{success:!1,content:`\u8FFD\u52A0\u5185\u5BB9\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("list_vault_folder",{name:"list_vault_folder",description:"\u5217\u51FA Vault \u6587\u4EF6\u5939\u4E2D\u7684\u6240\u6709\u6587\u4EF6\u548C\u5B50\u6587\u4EF6\u5939",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5939\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84"}},required:["path"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(t.path),n=this.app.vault.getAbstractFileByPath(e);if(!n||!(n instanceof r.TFolder))return{success:!1,content:`\u6587\u4EF6\u5939\u4E0D\u5B58\u5728: ${e}`};let s=[];for(let o of n.children)o instanceof r.TFile?s.push(`\u{1F4C4} ${o.path} (${o.stat.size} bytes)`):o instanceof r.TFolder&&s.push(`\u{1F4C1} ${o.path}/`);return{success:!0,content:s.length>0?s.join(`
`):"\u6587\u4EF6\u5939\u4E3A\u7A7A"}}catch(t){return{success:!1,content:`\u5217\u51FA\u6587\u4EF6\u5939\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("create_vault_folder",{name:"create_vault_folder",description:"\u5728 Vault \u4E2D\u521B\u5EFA\u6587\u4EF6\u5939\uFF08\u652F\u6301\u9012\u5F52\u521B\u5EFA\uFF09",parameters:{type:"object",properties:{path:{type:"string",description:"\u6587\u4EF6\u5939\u5728 Vault \u4E2D\u7684\u76F8\u5BF9\u8DEF\u5F84"}},required:["path"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(t.path);return await this.ensureFolder(e),{success:!0,content:`\u6587\u4EF6\u5939\u5DF2\u521B\u5EFA: ${e}`}}catch(t){return{success:!1,content:`\u521B\u5EFA\u6587\u4EF6\u5939\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("search_vault_files",{name:"search_vault_files",description:"\u5728 Vault \u4E2D\u641C\u7D22\u6587\u4EF6\u540D\u5305\u542B\u5173\u952E\u8BCD\u7684\u6587\u4EF6",parameters:{type:"object",properties:{query:{type:"string",description:"\u641C\u7D22\u5173\u952E\u8BCD"},folder:{type:"string",description:"\u9650\u5B9A\u641C\u7D22\u7684\u6587\u4EF6\u5939\u8DEF\u5F84\uFF08\u53EF\u9009\uFF09"}},required:["query"]},execute:async i=>{try{let t=this.strArgs(i),e=t.query.toLowerCase(),s=this.app.vault.getFiles().filter(c=>c.path.toLowerCase().includes(e));if(t.folder){let c=(0,r.normalizePath)(t.folder).toLowerCase();s=s.filter(a=>a.path.toLowerCase().startsWith(c))}let o=s.slice(0,50).map(c=>`\u{1F4C4} ${c.path}`);return{success:!0,content:o.length>0?`\u627E\u5230 ${s.length} \u4E2A\u6587\u4EF6:
${o.join(`
`)}`:"\u672A\u627E\u5230\u5339\u914D\u6587\u4EF6"}}catch(t){return{success:!1,content:`\u641C\u7D22\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("search_vault_content",{name:"search_vault_content",description:"\u5728 Vault \u6587\u4EF6\u5185\u5BB9\u4E2D\u641C\u7D22\u5305\u542B\u5173\u952E\u8BCD\u7684\u6587\u4EF6",parameters:{type:"object",properties:{query:{type:"string",description:"\u641C\u7D22\u5185\u5BB9\u5173\u952E\u8BCD"},folder:{type:"string",description:"\u9650\u5B9A\u641C\u7D22\u7684\u6587\u4EF6\u5939\u8DEF\u5F84\uFF08\u53EF\u9009\uFF09"}},required:["query"]},execute:async i=>{try{let t=this.strArgs(i),e=t.query.toLowerCase(),n=this.app.vault.getMarkdownFiles();if(t.folder){let o=(0,r.normalizePath)(t.folder).toLowerCase();n=n.filter(c=>c.path.toLowerCase().startsWith(o))}let s=[];for(let o of n.slice(0,100))(await this.app.vault.cachedRead(o)).toLowerCase().includes(e)&&s.push(`\u{1F4C4} ${o.path}`);return{success:!0,content:s.length>0?`\u627E\u5230 ${s.length} \u4E2A\u6587\u4EF6:
${s.join(`
`)}`:"\u672A\u627E\u5230\u5339\u914D\u5185\u5BB9"}}catch(t){return{success:!1,content:`\u641C\u7D22\u5931\u8D25: ${this.getErrorMessage(t)}`}}}})}registerSkillTools(){this.tools.set("read_skill",{name:"read_skill",description:"\u8BFB\u53D6 SKILL.md \u6587\u4EF6\u6216 references/ \u4E2D\u7684\u53C2\u8003\u6A21\u677F\u6587\u4EF6\u3002\u7528\u4E8E\u968F\u65F6\u67E5\u9605\u77E5\u8BC6\u5E93\u6784\u5EFA\u89C4\u8303\u539F\u6587",parameters:{type:"object",properties:{file:{type:"string",description:"\u8981\u8BFB\u53D6\u7684\u6587\u4EF6\u540D\u3002\u53EF\u9009\u503C\uFF1ASKILL.md\uFF08\u4E3B\u89C4\u8303\uFF09\u3001\u77E5\u8BC6\u70B9\u9875\u9762\u6A21\u677F.md\u3001\u4EBA\u7269\u4F20\u8BB0\u6A21\u677F.md\u3001\u7EC4\u7EC7\u6863\u6848\u6A21\u677F.md\u3001\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15\u6A21\u677F.md\u3001\u66F4\u65B0\u65E5\u5FD7\u6A21\u677F.md\u3001AGENTS-template.md\u3001\u51B2\u7A81\u8BB0\u5F55\u6A21\u677F.md"}},required:["file"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(this.settings.skillFolderPath),n=`${e}/references`,s;t.file==="SKILL.md"?s=`${e}/SKILL.md`:s=`${n}/${t.file}`;let o=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(s));return!o||!(o instanceof r.TFile)?{success:!1,content:`\u6587\u4EF6\u4E0D\u5B58\u5728: ${s}\u3002Skill \u6587\u4EF6\u5939\u8DEF\u5F84: ${this.settings.skillFolderPath}`}:{success:!0,content:await this.app.vault.read(o)}}catch(t){return{success:!1,content:`\u8BFB\u53D6\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("init_knowledge_base",{name:"init_knowledge_base",description:"\u521D\u59CB\u5316\u4E13\u9898\u77E5\u8BC6\u5E93\u76EE\u5F55\u7ED3\u6784\uFF0C\u521B\u5EFA\u6240\u6709\u5FC5\u9700\u7684\u6587\u4EF6\u5939\u548C\u521D\u59CB\u7D22\u5F15\u6587\u4EF6",parameters:{type:"object",properties:{topic_name:{type:"string",description:"\u4E13\u9898\u540D\u79F0\uFF0C\u5982'\u5DF4\u83F2\u7279\u6295\u8D44'\u3001'Python\u7F16\u7A0B'"},categories:{type:"string",description:"\u77E5\u8BC6\u70B9\u5E93\u5206\u7C7B\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u5982'\u6838\u5FC3\u6982\u5FF5,\u65B9\u6CD5\u8BBA,\u7ECF\u5178\u6848\u4F8B,\u4EBA\u7269\u4F20\u8BB0,\u7EC4\u7EC7\u6863\u6848,\u884C\u4E1A\u5206\u6790'"},raw_categories:{type:"string",description:"\u539F\u59CB\u8D44\u6599\u5206\u7C7B\uFF0C\u9017\u53F7\u5206\u9694\uFF0C\u5982'\u81F4\u80A1\u4E1C\u4FE1,\u80A1\u4E1C\u5927\u4F1A\u6F14\u8BB2'"}},required:["topic_name"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(this.settings.knowledgeBasePath),n=(t.categories||"\u6838\u5FC3\u6982\u5FF5,\u65B9\u6CD5\u8BBA,\u7ECF\u5178\u6848\u4F8B,\u4EBA\u7269\u4F20\u8BB0,\u7EC4\u7EC7\u6863\u6848,\u884C\u4E1A\u5206\u6790").split(","),s=(t.raw_categories||"\u8D44\u6599\u5206\u7C7B1,\u8D44\u6599\u5206\u7C7B2").split(","),o=[e,`${e}/00-\u539F\u59CB\u8D44\u6599`,`${e}/00-\u539F\u59CB\u8D44\u6599/assets`,`${e}/10-\u77E5\u8BC6\u70B9\u5E93`,`${e}/20-\u77E5\u8BC6\u7D22\u5F15`,`${e}/30-\u7EF4\u62A4\u8BB0\u5F55`];for(let h of s)o.push(`${e}/00-\u539F\u59CB\u8D44\u6599/${h.trim()}`);for(let h of n)o.push(`${e}/10-\u77E5\u8BC6\u70B9\u5E93/${h.trim()}`);for(let h of o)await this.ensureFolder(h);let c=`# ${t.topic_name}\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15

## \u4E00\u3001\u77E5\u8BC6\u70B9\u5206\u7C7B\u7D22\u5F15

${n.map((h,d)=>`### ${d+1}. ${h.trim()}\uFF080\u4E2A\uFF09\u{1F534}

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
${s.map(h=>`| ${h.trim()} | 0\u4EFD | \u{1F7E1} \u6536\u96C6\u4E2D |`).join(`
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
`;await this.createFileOnly(`${e}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,c);let a=`# ${t.topic_name}\u5173\u952E\u8BCD\u7D22\u5F15

| \u5173\u952E\u8BCD | \u76F8\u5173\u77E5\u8BC6\u70B9 | \u51FA\u73B0\u6B21\u6570 |
|--------|-----------|----------|

\uFF08\u6682\u65E0\u5173\u952E\u8BCD\uFF09
`;await this.createFileOnly(`${e}/20-\u77E5\u8BC6\u7D22\u5F15/\u5173\u952E\u8BCD\u7D22\u5F15.md`,a);let p=`# ${t.topic_name}\u77E5\u8BC6\u70B9\u5173\u7CFB\u56FE\u8C31

## \u77E5\u8BC6\u70B9\u5173\u7CFB

\`\`\`mermaid
graph LR
    start[\u77E5\u8BC6\u5E93] --> \u5F85\u8865\u5145
\`\`\`

## \u5173\u7CFB\u8BF4\u660E

\uFF08\u6682\u65E0\u5173\u7CFB\u6570\u636E\uFF09
`;await this.createFileOnly(`${e}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u70B9\u5173\u7CFB\u56FE\u8C31.md`,p);let l=`# \u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7

## ${new Date().toISOString().split("T")[0]} | \u77E5\u8BC6\u5E93\u521D\u59CB\u5316

**\u64CD\u4F5C\u4EBA\uFF1A** \u77E5\u8BC6\u5E93\u7EF4\u62A4\u8005
**\u53D8\u66F4\u7C7B\u578B\uFF1A** \u65B0\u5EFA
**\u89E6\u53D1\u6765\u6E90\uFF1A** \u7528\u6237\u6307\u4EE4

### \u53D8\u66F4\u5185\u5BB9

\u521D\u59CB\u5316 ${t.topic_name} \u77E5\u8BC6\u5E93\uFF0C\u521B\u5EFA\u76EE\u5F55\u7ED3\u6784\u548C\u521D\u59CB\u7D22\u5F15\u6587\u4EF6\u3002

### \u65B0\u5EFA\u9875\u9762

- 20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md
- 20-\u77E5\u8BC6\u7D22\u5F15/\u5173\u952E\u8BCD\u7D22\u5F15.md
- 20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u70B9\u5173\u7CFB\u56FE\u8C31.md
- 30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md

---
`;await this.createFileOnly(`${e}/30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md`,l);let u=`# \u51B2\u7A81\u4E0E\u9519\u8BEF\u8BB0\u5F55

\uFF08\u6682\u65E0\u51B2\u7A81\u8BB0\u5F55\uFF09
`;await this.createFileOnly(`${e}/30-\u7EF4\u62A4\u8BB0\u5F55/\u51B2\u7A81\u4E0E\u9519\u8BEF\u8BB0\u5F55.md`,u);let g=`# AGENTS.md \u2014 ${t.topic_name}\u77E5\u8BC6\u5E93\u7EF4\u62A4\u89C4\u5219

> \u57FA\u4E8E Karpathy LLM Wiki \u65B9\u6CD5\u8BBA

## \u76EE\u5F55\u7ED3\u6784

\`\`\`
${t.topic_name}/
\u251C\u2500\u2500 00-\u539F\u59CB\u8D44\u6599/
\u251C\u2500\u2500 10-\u77E5\u8BC6\u70B9\u5E93/
\u251C\u2500\u2500 20-\u77E5\u8BC6\u7D22\u5F15/
\u251C\u2500\u2500 30-\u7EF4\u62A4\u8BB0\u5F55/
\u2514\u2500\u2500 AGENTS.md
\`\`\`
`;try{let h=(0,r.normalizePath)(`${this.settings.skillFolderPath}/references/AGENTS-template.md`),d=this.app.vault.getAbstractFileByPath(h);d&&d instanceof r.TFile&&(g=(await this.app.vault.read(d)).replace(/\[专题名称\]/g,t.topic_name).replace(/YYYY-MM-DD/g,new Date().toISOString().split("T")[0]).replace(/\[方括号\]/g,""))}catch(h){}return await this.createFileOnly(`${e}/AGENTS.md`,g),{success:!0,content:`\u77E5\u8BC6\u5E93 "${t.topic_name}" \u5DF2\u521D\u59CB\u5316\u5B8C\u6210\uFF01

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

\u73B0\u5728\u53EF\u4EE5\u5F00\u59CB\u653E\u5165\u539F\u59CB\u8D44\u6599\u5E76\u6267\u884C\u6444\u53D6\u5DE5\u4F5C\u6D41\u4E86\uFF01`}}catch(t){return{success:!1,content:`\u521D\u59CB\u5316\u77E5\u8BC6\u5E93\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("ingest_raw_material",{name:"ingest_raw_material",description:"\u6444\u53D6\u539F\u59CB\u8D44\u6599\uFF1A\u8BFB\u53D6\u539F\u59CB\u8D44\u6599\u6587\u4EF6\uFF0C\u8FD4\u56DE\u5B8C\u6574\u5185\u5BB9\u4F9BLLM\u63D0\u70BC\u77E5\u8BC6\u70B9\u3002\u8BFB\u53D6\u540ELLM\u5FC5\u987B\u6267\u884C\u5B8C\u6574\u5DE5\u4F5C\u6D41\uFF1A\u63D0\u70BC\u2192\u521B\u5EFA\u9875\u9762\u2192\u66F4\u65B0\u7D22\u5F15\u2192\u8FFD\u52A0\u65E5\u5FD7\u3002\u8BF7\u4F7F\u7528 create_and_index_page \u4E00\u7AD9\u5F0F\u5B8C\u6210",parameters:{type:"object",properties:{file_path:{type:"string",description:"\u539F\u59CB\u8D44\u6599\u6587\u4EF6\u8DEF\u5F84\uFF08\u5FC5\u987B\u662F\u4EE5 00-\u539F\u59CB\u8D44\u6599/ \u5F00\u5934\u7684\u8DEF\u5F84\uFF09"},focus_topics:{type:"string",description:"\u91CD\u70B9\u5173\u6CE8\u7684\u77E5\u8BC6\u70B9\u4E3B\u9898\uFF0C\u9017\u53F7\u5206\u9694\uFF08\u53EF\u9009\uFF09"}},required:["file_path"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(t.file_path),n=this.app.vault.getAbstractFileByPath(e);if(!n||!(n instanceof r.TFile))return{success:!1,content:`\u539F\u59CB\u8D44\u6599\u6587\u4EF6\u4E0D\u5B58\u5728: ${e}`};let s=await this.app.vault.read(n),o=s.length>8e3?s.substring(0,8e3)+`

...\uFF08\u4EE5\u4E0B\u5185\u5BB9\u7701\u7565\uFF0C\u5171`+s.length+"\u5B57\uFF09":s,c=t.focus_topics?`\u91CD\u70B9\u5173\u6CE8\u77E5\u8BC6\u70B9\uFF1A${t.focus_topics}`:"\u8BF7\u81EA\u884C\u5224\u65AD\u539F\u59CB\u8D44\u6599\u4E2D\u6709\u54EA\u4E9B\u503C\u5F97\u63D0\u70BC\u7684\u77E5\u8BC6\u70B9";return{success:!0,content:`\u{1F4C4} \u5DF2\u8BFB\u53D6\u539F\u59CB\u8D44\u6599: ${e}\uFF08\u5171${s.length}\u5B57\uFF09

---
\u5185\u5BB9\u9884\u89C8:
${o}

---

## \u26A0\uFE0F \u63A5\u4E0B\u6765\u4F60\u5FC5\u987B\u6309\u4EE5\u4E0B\u5DE5\u4F5C\u6D41\u6267\u884C\uFF0C\u4E0D\u80FD\u8DF3\u8FC7\u4EFB\u4F55\u6B65\u9AA4\uFF01

### \u5FC5\u987B\u5B8C\u6210\u7684\u6807\u51C6\u5DE5\u4F5C\u6D41\uFF1A

**Step 1 \u2014 \u63D0\u70BC\u77E5\u8BC6\u70B9\uFF08\u4F60\u73B0\u5728\u7684\u4F4D\u7F6E\uFF09**
${c}

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
- \u5F53\u524D\u77E5\u8BC6\u5E93\u6982\u51B5\uFF08\u6587\u4EF6\u6570\u3001\u6210\u719F\u5EA6\uFF09`}}catch(t){return{success:!1,content:`\u6444\u53D6\u8D44\u6599\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("create_knowledge_page",{name:"create_knowledge_page",description:"\u521B\u5EFA\u77E5\u8BC6\u70B9\u9875\u9762\u3002\u63A8\u8350\u4F18\u5148\u4F7F\u7528 create_and_index_page \u4E00\u7AD9\u5F0F\u521B\u5EFA+\u7D22\u5F15+\u65E5\u5FD7\u3002\u63A8\u8350\u53EA\u4F20 title + category + content(\u5B8C\u6574markdown) \u4E09\u4E2A\u53C2\u6570\uFF0C\u81EA\u52A8\u5957\u7528\u6A21\u677F",parameters:{type:"object",properties:{category:{type:"string",description:"\u77E5\u8BC6\u70B9\u5206\u7C7B\uFF0C\u5982\uFF1A\u6838\u5FC3\u6982\u5FF5\u3001\u65B9\u6CD5\u8BBA\u3001\u7ECF\u5178\u6848\u4F8B\u3001\u884C\u4E1A\u5206\u6790"},title:{type:"string",description:"\u77E5\u8BC6\u70B9\u540D\u79F0"},definition:{type:"string",description:"\u4E00\u53E5\u8BDD\u5B9A\u4E49\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},core_content:{type:"string",description:"\u6838\u5FC3\u5B9A\u4E49\u5185\u5BB9\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},content:{type:"string",description:"\u5B8C\u6574markdown\u5185\u5BB9\uFF08\u53EF\u9009\uFF0C\u63D0\u4F9B\u540E\u5FFD\u7565\u5176\u4ED6\u683C\u5F0F\u5316\u53C2\u6570\uFF09\u3002\u63A8\u8350\u4F7F\u7528\u6B64\u53C2\u6570\uFF0C\u76F4\u63A5\u5C06\u5B8C\u6574\u76849\u7AE0markdown\u4F20\u5165"},key_points:{type:"string",description:"\u6838\u5FC3\u8981\u70B9\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},cases:{type:"string",description:"\u7ECF\u5178\u6848\u4F8B\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},methods:{type:"string",description:"\u5B9E\u8DF5\u65B9\u6CD5\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},misconceptions:{type:"string",description:"\u5E38\u89C1\u8BEF\u533A\uFF08\u53EF\u9009\uFF0C\u6709content\u65F6\u5FFD\u7565\uFF09"},related_topics:{type:"string",description:"\u76F8\u5173\u77E5\u8BC6\u70B9\uFF0C\u9017\u53F7\u5206\u9694\uFF08\u53EF\u9009\uFF09"},source_refs:{type:"string",description:"\u539F\u6587\u51FA\u5904\u8DEF\u5F84\uFF0C\u9017\u53F7\u5206\u9694\uFF08\u53EF\u9009\uFF09"},insights:{type:"string",description:"\u5BF9\u76EE\u6807\u4EBA\u7FA4\u7684\u542F\u793A\uFF08\u53EF\u9009\uFF09"},maturity:{type:"string",description:"\u6210\u719F\u5EA6\u7EA7\u522B",enum:["\u5B8C\u6574\u7EA7","\u57FA\u7840\u7EA7","\u6846\u67B6\u7EA7"]}},required:["category","title"]},execute:async i=>{try{let t=this.strArgs(i),n=`${(0,r.normalizePath)(this.settings.knowledgeBasePath)}/10-\u77E5\u8BC6\u70B9\u5E93/${t.category}`;await this.ensureFolder(n);let s=new Date().toISOString().split("T")[0],o=`${n}/${t.title}.md`,c=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(o));if(c&&c instanceof r.TFile)return{success:!1,content:`\u77E5\u8BC6\u70B9\u9875\u9762\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${o}\u3002\u8BF7\u4F7F\u7528 update_knowledge_page \u8FFD\u52A0\u5185\u5BB9\u3002`};if(t.content)return await this.createFileOnly(o,t.content),{success:!0,content:`\u77E5\u8BC6\u70B9\u9875\u9762\u5DF2\u521B\u5EFA: ${o}\uFF08\u4F7F\u7528\u5B8C\u6574markdown\u5185\u5BB9\uFF09

\u63A5\u4E0B\u6765\u5FC5\u987B\u6267\u884C\uFF1A
1. \u4F7F\u7528 update_index \u5DE5\u5177 update_index action=add_entry \u4EE5\u66F4\u65B0\u7D22\u5F15
2. \u4F7F\u7528 append_vault_file \u8FFD\u52A0\u66F4\u65B0\u65E5\u5FD7\u5230 30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md

\u6216\u8005\u76F4\u63A5\u4F7F\u7528 create_and_index_page \u4E00\u7AD9\u5F0F\u5B8C\u6210\u4E0A\u8FF0\u5168\u90E8\u6B65\u9AA4\u3002`};let a=t.maturity?`${t.maturity}`:"\u57FA\u7840\u7EA7",p=a.includes("\u5B8C\u6574")?"\u{1F7E2}":a.includes("\u6846\u67B6")?"\u{1F534}":"\u{1F7E1}",l=`### \u8981\u70B91\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(t.key_points)try{l=JSON.parse(t.key_points).map((y,C)=>`### \u8981\u70B9${C+1}\uFF1A${y.name||y.title}

${y.content||y.description||""}`).join(`

`)}catch(f){l=t.key_points}let u=`### \u6848\u4F8B1\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(t.cases)try{u=JSON.parse(t.cases).map((y,C)=>`### \u6848\u4F8B${C+1}\uFF1A${y.name||y.title}

${y.content||y.description||""}`).join(`

`)}catch(f){u=t.cases}let g=`### \u65B9\u6CD51\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(t.methods)try{g=JSON.parse(t.methods).map((y,C)=>`### \u65B9\u6CD5${C+1}\uFF1A${y.name||y.title}

${y.content||y.description||""}`).join(`

`)}catch(f){g=t.methods}let h=`### \u8BEF\u533A1\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(t.misconceptions)try{h=JSON.parse(t.misconceptions).map((y,C)=>`### \u8BEF\u533A${C+1}\uFF1A${y.name||y.title}

${y.content||y.description||""}`).join(`

`)}catch(f){h=t.misconceptions}let d=(t.related_topics||"").split(",").filter(f=>f.trim()).map(f=>`- [[${f.trim()}]]`).join(`
`),m=(t.source_refs||"").split(",").filter(f=>f.trim()).map(f=>`- [[${f.trim()}]]`).join(`
`),w=`# ${t.title}

> ${t.definition||"\u5F85\u8865\u5145"}

> ${p} ${a} | \u6700\u540E\u66F4\u65B0\uFF1A${s}

---

## \u4E00\u3001\u6838\u5FC3\u5B9A\u4E49

${t.core_content||"\u5F85\u8865\u5145"}

---

## \u4E8C\u3001\u6838\u5FC3\u8981\u70B9

${l}

---

## \u4E09\u3001\u7ECF\u5178\u6848\u4F8B

${u}

---

## \u56DB\u3001\u5B9E\u8DF5\u65B9\u6CD5

${g}

---

## \u4E94\u3001\u5E38\u89C1\u8BEF\u533A

${h}

---

## \u516D\u3001\u76F8\u5173\u77E5\u8BC6\u70B9

${d||"- [\u5F85\u8865\u5145]"}

---

## \u4E03\u3001\u539F\u6587\u51FA\u5904

> \u26A0\uFE0F \u94FE\u63A5\u89C4\u8303\uFF1A\u539F\u6587\u51FA\u5904\u5FC5\u987B\u4F7F\u7528 Obsidian \u53CC\u5411\u94FE\u63A5 [[\u8DEF\u5F84]] \u8BED\u6CD5

${m||"- [\u5F85\u8865\u5145]"}

---

## \u516B\u3001\u5BF9\u76EE\u6807\u4EBA\u7FA4\u7684\u542F\u793A

${t.insights||"[\u5F85\u8865\u5145]"}

---

## \u4E5D\u3001\u66F4\u65B0\u65E5\u5FD7

| \u65E5\u671F | \u64CD\u4F5C\u7C7B\u578B | \u89E6\u53D1\u6765\u6E90 | \u53D8\u66F4\u5185\u5BB9 |
|------|---------|---------|----------|
| ${s} | \u521B\u5EFA | \u7528\u6237\u6307\u4EE4 | \u521D\u59CB\u5316\u9875\u9762 |
`;return await this.createFileOnly(o,w),{success:!0,content:`\u77E5\u8BC6\u70B9\u9875\u9762\u5DF2\u521B\u5EFA: ${o}

\u63A5\u4E0B\u6765\u5FC5\u987B\u6267\u884C\uFF1A
1. \u4F7F\u7528 update_index \u5DE5\u5177 action=add_entry \u66F4\u65B0\u7D22\u5F15
2. \u5728\u81F3\u5C113\u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u6DFB\u52A0\u5165\u94FE
3. \u4F7F\u7528 append_vault_file \u8FFD\u52A0\u66F4\u65B0\u65E5\u5FD7\u5230 30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md

\u63A8\u8350\u76F4\u63A5\u4F7F\u7528 create_and_index_page \u4E00\u7AD9\u5F0F\u5B8C\u6210\u4EE5\u4E0A\u6B65\u9AA4\u3002`}}catch(t){return{success:!1,content:`\u521B\u5EFA\u77E5\u8BC6\u70B9\u9875\u9762\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("create_and_index_page",{name:"create_and_index_page",description:"\u4E00\u7AD9\u5F0F\u521B\u5EFA\u77E5\u8BC6\u9875\u9762 + \u66F4\u65B0\u7D22\u5F15 + \u8FFD\u52A0\u65E5\u5FD7\u3002\u63A8\u8350\u4F7F\u7528\u6B64\u5DE5\u5177\u66FF\u4EE3\u5206\u522B\u8C03\u7528 create_knowledge_page + update_index + append_vault_file",parameters:{type:"object",properties:{page_type:{type:"string",description:"\u9875\u9762\u7C7B\u578B\uFF1Aknowledge=\u77E5\u8BC6\u70B9, person=\u4EBA\u7269\u4F20\u8BB0, organization=\u7EC4\u7EC7\u6863\u6848",enum:["knowledge","person","organization"]},category:{type:"string",description:"\u77E5\u8BC6\u70B9\u5206\u7C7B\uFF08page_type=knowledge\u65F6\u5FC5\u586B\uFF09\uFF0C\u5982\uFF1A\u6838\u5FC3\u6982\u5FF5\u3001\u65B9\u6CD5\u8BBA"},title:{type:"string",description:"\u9875\u9762\u6807\u9898/\u77E5\u8BC6\u70B9\u540D\u79F0"},content:{type:"string",description:"\u5B8C\u6574\u7684markdown\u9875\u9762\u5185\u5BB9\uFF08\u5FC5\u987B\u5305\u542B\u5168\u90E89\u4E2A\u7AE0\u8282\uFF09"},entry_category:{type:"string",description:"\u7D22\u5F15\u4E2D\u7684\u5206\u7C7B\u540D\uFF08\u53EF\u9009\uFF0C\u9ED8\u8BA4\u4E0Ecategory\u76F8\u540C\uFF09"},entry_description:{type:"string",description:"\u7D22\u5F15\u6761\u76EE\u7684\u4E00\u53E5\u8BDD\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09"},maturity:{type:"string",description:"\u6210\u719F\u5EA6\u7EA7\u522B",enum:["\u5B8C\u6574\u7EA7","\u57FA\u7840\u7EA7","\u6846\u67B6\u7EA7"]},keywords:{type:"string",description:"\u65B0\u589E\u5173\u952E\u8BCD\uFF0C\u9017\u53F7\u5206\u9694\uFF08\u53EF\u9009\uFF09"}},required:["page_type","title","content"]},execute:async i=>{var t,e;try{let n=this.strArgs(i),s=(0,r.normalizePath)(this.settings.knowledgeBasePath),o=new Date().toISOString().split("T")[0],c=(t=n.maturity)!=null&&t.includes("\u5B8C\u6574")?"\u{1F7E2}":(e=n.maturity)!=null&&e.includes("\u6846\u67B6")?"\u{1F534}":"\u{1F7E1}",a=n.category||"\u672A\u5206\u7C7B";n.page_type==="person"?a="\u4EBA\u7269\u4F20\u8BB0":n.page_type==="organization"&&(a="\u7EC4\u7EC7\u6863\u6848");let p=`${s}/10-\u77E5\u8BC6\u70B9\u5E93/${a}`;await this.ensureFolder(p);let l=`${p}/${n.title}.md`,u=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(l));if(u&&u instanceof r.TFile)return{success:!1,content:`\u9875\u9762\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${l}\u3002\u8BF7\u4F7F\u7528 update_knowledge_page \u8FFD\u52A0\u5185\u5BB9\u3002`};await this.createFileOnly(l,n.content);let g=n.entry_category||a,h=`${s}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,d=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(h));if(d&&d instanceof r.TFile){let y=await this.app.vault.read(d),C=g.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),T=new RegExp(`###\\s+\\d+\\.\\s+${C}\\s*\\(\\d+\u4E2A\\)`),v=y.match(T);if(v){let b=y.indexOf(v[0]),P=y.indexOf(`
### `,b+1),A=P===-1?y.indexOf(`
---`,b):P,M=y.substring(b,A),E=M.match(/\((\d+)个\)/),z=E?parseInt(E[1]):0,U=M.replace(`(${z}\u4E2A)`,`(${z+1}\u4E2A)`).replace(/（暂无知识点）/,""),J=`- [[${n.title}]] ${c} - ${n.entry_description||"\u5F85\u8865\u5145"}`,q=y.substring(0,b)+U.trimEnd()+`
`+J+`
`+y.substring(A);await this.app.vault.modify(d,q);let N=q.match(/知识点总数：(\d+)个/);if(N){let G=parseInt(N[1])+1;await this.app.vault.modify(d,q.replace(`\u77E5\u8BC6\u70B9\u603B\u6570\uFF1A${N[1]}\u4E2A`,`\u77E5\u8BC6\u70B9\u603B\u6570\uFF1A${G}\u4E2A`))}}if(n.keywords){let b=`${s}/20-\u77E5\u8BC6\u7D22\u5F15/\u5173\u952E\u8BCD\u7D22\u5F15.md`,P=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(b));if(P&&P instanceof r.TFile){let A=await this.app.vault.read(P),M=n.keywords.split(",").map(E=>`| ${E.trim()} | [[${n.title}]] | 1 |`).join(`
`);await this.app.vault.modify(P,A.replace("\uFF08\u6682\u65E0\u5173\u952E\u8BCD\uFF09",M))}}}let m=`${s}/30-\u7EF4\u62A4\u8BB0\u5F55/\u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7.md`,w=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(m)),f=`
## ${o} | \u65B0\u5EFA\u77E5\u8BC6\u70B9\uFF1A${n.title}

**\u64CD\u4F5C\u4EBA\uFF1A** \u77E5\u8BC6\u5E93\u7EF4\u62A4\u8005
**\u53D8\u66F4\u7C7B\u578B\uFF1A** \u65B0\u5EFA
**\u89E6\u53D1\u6765\u6E90\uFF1A** \u7528\u6237\u6307\u4EE4

### \u53D8\u66F4\u5185\u5BB9

\u521B\u5EFA\u77E5\u8BC6\u70B9\u9875\u9762\uFF1A${n.title}\uFF08${a}\uFF09

### \u65B0\u5EFA\u9875\u9762

- ${l}

### \u540C\u6B65\u66F4\u65B0

- 20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md - \u6DFB\u52A0\u6761\u76EE

---
`;if(w&&w instanceof r.TFile){let y=await this.app.vault.read(w);await this.app.vault.modify(w,y+f)}else await this.createFileOnly(m,`# \u77E5\u8BC6\u5E93\u66F4\u65B0\u65E5\u5FD7
${f}`);return{success:!0,content:`\u4E00\u7AD9\u5F0F\u64CD\u4F5C\u5B8C\u6210\uFF01
1. \u2705 \u9875\u9762\u5DF2\u521B\u5EFA: ${l}
2. \u2705 \u7D22\u5F15\u5DF2\u66F4\u65B0: ${g} +1
3. \u2705 \u66F4\u65B0\u65E5\u5FD7\u5DF2\u8FFD\u52A0

\u8BF7\u7EE7\u7EED\uFF1A
4. \u5728\u81F3\u5C113\u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u6DFB\u52A0\u5165\u94FE\uFF08\u7528 append_vault_file \u8FFD\u52A0 [[${n.title}]] \u5230\u76F8\u5173\u9875\u9762\u7684\u300C\u76F8\u5173\u77E5\u8BC6\u70B9\u300D\u7AE0\u8282\uFF09
5. \u6267\u884C\u81EA\u68C0\u6E05\u5355`}}catch(n){return{success:!1,content:`\u4E00\u7AD9\u5F0F\u521B\u5EFA\u5931\u8D25: ${this.getErrorMessage(n)}`}}}}),this.tools.set("create_person_page",{name:"create_person_page",description:"\u521B\u5EFA\u4EBA\u7269\u4F20\u8BB0\u9875\u9762\uFF0C\u81EA\u52A8\u5E94\u7528\u4EBA\u7269\u4F20\u8BB0\u6A21\u677F",parameters:{type:"object",properties:{name:{type:"string",description:"\u4EBA\u7269\u540D\u79F0"},intro:{type:"string",description:"\u4E00\u53E5\u8BDD\u4ECB\u7ECD"},birth_year:{type:"string",description:"\u51FA\u751F\u5E74\u4EFD"},identity:{type:"string",description:"\u4E3B\u8981\u8EAB\u4EFD/\u804C\u4E1A"},field_relation:{type:"string",description:"\u4E0E\u672C\u9886\u57DF\u7684\u5173\u7CFB"},biography:{type:"string",description:"\u751F\u5E73\u7ECF\u5386"},contributions:{type:"string",description:"\u6838\u5FC3\u8D21\u732E\uFF0CJSON\u6570\u7EC4\u683C\u5F0F"},quotes:{type:"string",description:"\u7ECF\u5178\u8BED\u5F55\uFF0CJSON\u6570\u7EC4\u683C\u5F0F"},influence:{type:"string",description:"\u5F71\u54CD\u4E0E\u542F\u793A"},related_topics:{type:"string",description:"\u76F8\u5173\u77E5\u8BC6\u70B9\uFF0C\u9017\u53F7\u5206\u9694"},related_orgs:{type:"string",description:"\u76F8\u5173\u7EC4\u7EC7\uFF0C\u9017\u53F7\u5206\u9694"},source_refs:{type:"string",description:"\u539F\u6587\u51FA\u5904\u8DEF\u5F84\uFF0C\u9017\u53F7\u5206\u9694"},maturity:{type:"string",description:"\u6210\u719F\u5EA6\u7EA7\u522B",enum:["\u{1F7E2} \u5B8C\u6574\u7EA7","\u{1F7E1} \u57FA\u7840\u7EA7","\u{1F534} \u6846\u67B6\u7EA7"]}},required:["name","intro","identity"]},execute:async i=>{try{let t=this.strArgs(i),n=`${(0,r.normalizePath)(this.settings.knowledgeBasePath)}/10-\u77E5\u8BC6\u70B9\u5E93/\u4EBA\u7269\u4F20\u8BB0`;await this.ensureFolder(n);let s=new Date().toISOString().split("T")[0],o=t.maturity||"\u{1F7E1} \u57FA\u7840\u7EA7",c=`### \u8D21\u732E1\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(t.contributions)try{c=JSON.parse(t.contributions).map((w,f)=>`### \u8D21\u732E${f+1}\uFF1A${w.name||w.title}

${w.content||w.description||""}`).join(`

`)}catch(m){c=t.contributions}let a="> [\u5F85\u8865\u5145]";if(t.quotes)try{a=JSON.parse(t.quotes).map(w=>`> "${w.content||w.text}"
> \u2014\u2014 ${w.source||"\u51FA\u5904\u5F85\u8865\u5145"}`).join(`

`)}catch(m){a=t.quotes}let p=(t.related_topics||"").split(",").filter(m=>m.trim()).map(m=>`- [[${m.trim()}]]`).join(`
`),l=(t.related_orgs||"").split(",").filter(m=>m.trim()).map(m=>`- [[${m.trim()}]]`).join(`
`),u=(t.source_refs||"").split(",").filter(m=>m.trim()).map(m=>`- [[${m.trim()}]]`).join(`
`),g=`# ${t.name}

> ${t.intro}

> ${o} | \u7EA62000\u5B57 | \u6700\u540E\u66F4\u65B0\uFF1A${s}

---

## \u4E00\u3001\u4EBA\u7269\u7B80\u4ECB

- **\u59D3\u540D**\uFF1A${t.name}
- **\u751F\u5352\u5E74**\uFF1A${t.birth_year||"\u5F85\u8865\u5145"}
- **\u8EAB\u4EFD**\uFF1A${t.identity}
- **\u4E0E\u9886\u57DF\u7684\u5173\u7CFB**\uFF1A${t.field_relation||"\u5F85\u8865\u5145"}

---

## \u4E8C\u3001\u751F\u5E73\u7ECF\u5386

${t.biography||`### \u65E9\u671F\u7ECF\u5386

[\u5F85\u8865\u5145]

### \u5173\u952E\u8F6C\u6298

[\u5F85\u8865\u5145]

### \u4E3B\u8981\u6210\u5C31

[\u5F85\u8865\u5145]`}

---

## \u4E09\u3001\u6838\u5FC3\u8D21\u732E

${c}

---

## \u56DB\u3001\u7ECF\u5178\u8BED\u5F55

${a}

---

## \u4E94\u3001\u5F71\u54CD\u4E0E\u542F\u793A

${t.influence||"[\u5F85\u8865\u5145]"}

---

## \u516D\u3001\u76F8\u5173\u77E5\u8BC6\u70B9

${p||"- [\u5F85\u8865\u5145]"}

---

## \u4E03\u3001\u76F8\u5173\u7EC4\u7EC7

${l||"- [\u5F85\u8865\u5145]"}

---

## \u516B\u3001\u539F\u6587\u51FA\u5904

> \u26A0\uFE0F \u94FE\u63A5\u89C4\u8303\uFF1A\u5FC5\u987B\u4F7F\u7528 Obsidian \u53CC\u5411\u94FE\u63A5 [[\u8DEF\u5F84]] \u8BED\u6CD5

${u||"- [\u5F85\u8865\u5145]"}

---

## \u4E5D\u3001\u66F4\u65B0\u65E5\u5FD7

| \u65E5\u671F | \u64CD\u4F5C\u7C7B\u578B | \u89E6\u53D1\u6765\u6E90 | \u53D8\u66F4\u5185\u5BB9 |
|------|---------|---------|----------|
| ${s} | \u521B\u5EFA | \u7528\u6237\u6307\u4EE4 | \u521D\u59CB\u5316\u9875\u9762 |
`,h=`${n}/${t.name}.md`,d=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(h));return d&&d instanceof r.TFile?{success:!1,content:`\u4EBA\u7269\u4F20\u8BB0\u9875\u9762\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${h}\u3002\u8BF7\u4F7F\u7528 update_knowledge_page \u8FFD\u52A0\u5185\u5BB9\u3002`}:(await this.createFileOnly(h,g),{success:!0,content:`\u4EBA\u7269\u4F20\u8BB0\u9875\u9762\u5DF2\u521B\u5EFA: ${h}

\u8BF7\u7EE7\u7EED\u6267\u884C\uFF1A
1. \u4F7F\u7528 update_index \u5DE5\u5177\u66F4\u65B0\u7D22\u5F15
2. \u5728\u81F3\u5C113\u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u6DFB\u52A0\u5165\u94FE
3. \u8FFD\u52A0\u66F4\u65B0\u65E5\u5FD7`})}catch(t){return{success:!1,content:`\u521B\u5EFA\u4EBA\u7269\u4F20\u8BB0\u9875\u9762\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("create_organization_page",{name:"create_organization_page",description:"\u521B\u5EFA\u7EC4\u7EC7\u6863\u6848\u9875\u9762\uFF0C\u81EA\u52A8\u5E94\u7528\u7EC4\u7EC7\u6863\u6848\u6A21\u677F",parameters:{type:"object",properties:{name:{type:"string",description:"\u7EC4\u7EC7\u540D\u79F0"},intro:{type:"string",description:"\u4E00\u53E5\u8BDD\u4ECB\u7ECD"},founded_year:{type:"string",description:"\u6210\u7ACB\u5E74\u4EFD"},headquarters:{type:"string",description:"\u603B\u90E8\u4F4D\u7F6E"},main_business:{type:"string",description:"\u4E3B\u8425\u4E1A\u52A1"},industry:{type:"string",description:"\u884C\u4E1A\u5206\u7C7B"},history:{type:"string",description:"\u53D1\u5C55\u5386\u7A0B"},core_business:{type:"string",description:"\u6838\u5FC3\u4E1A\u52A1/\u6A21\u5F0F\u63CF\u8FF0"},key_figures:{type:"string",description:"\u5173\u952E\u4EBA\u7269\uFF0C\u9017\u53F7\u5206\u9694"},events:{type:"string",description:"\u91CD\u8981\u4E8B\u4EF6\uFF0CJSON\u6570\u7EC4\u683C\u5F0F"},related_topics:{type:"string",description:"\u76F8\u5173\u77E5\u8BC6\u70B9\uFF0C\u9017\u53F7\u5206\u9694"},source_refs:{type:"string",description:"\u539F\u6587\u51FA\u5904\u8DEF\u5F84\uFF0C\u9017\u53F7\u5206\u9694"},maturity:{type:"string",description:"\u6210\u719F\u5EA6\u7EA7\u522B",enum:["\u{1F7E2} \u5B8C\u6574\u7EA7","\u{1F7E1} \u57FA\u7840\u7EA7","\u{1F534} \u6846\u67B6\u7EA7"]}},required:["name","intro","main_business"]},execute:async i=>{try{let t=this.strArgs(i),n=`${(0,r.normalizePath)(this.settings.knowledgeBasePath)}/10-\u77E5\u8BC6\u70B9\u5E93/\u7EC4\u7EC7\u6863\u6848`;await this.ensureFolder(n);let s=new Date().toISOString().split("T")[0],o=t.maturity||"\u{1F7E1} \u57FA\u7840\u7EA7",c=`### \u4E8B\u4EF61\uFF1A[\u5F85\u8865\u5145]

[\u5F85\u8865\u5145]`;if(t.events)try{c=JSON.parse(t.events).map((m,w)=>`### \u4E8B\u4EF6${w+1}\uFF1A${m.name||m.title}

${m.content||m.description||""}`).join(`

`)}catch(d){c=t.events}let a=(t.key_figures||"").split(",").filter(d=>d.trim()).map(d=>`- [[${d.trim()}]]`).join(`
`),p=(t.related_topics||"").split(",").filter(d=>d.trim()).map(d=>`- [[${d.trim()}]]`).join(`
`),l=(t.source_refs||"").split(",").filter(d=>d.trim()).map(d=>`- [[${d.trim()}]]`).join(`
`),u=`# ${t.name}

> ${t.intro}

> ${o} | \u7EA62000\u5B57 | \u6700\u540E\u66F4\u65B0\uFF1A${s}

---

## \u4E00\u3001\u7EC4\u7EC7\u7B80\u4ECB

- **\u540D\u79F0**\uFF1A${t.name}
- **\u6210\u7ACB\u5E74\u4EFD**\uFF1A${t.founded_year||"\u5F85\u8865\u5145"}
- **\u603B\u90E8\u4F4D\u7F6E**\uFF1A${t.headquarters||"\u5F85\u8865\u5145"}
- **\u4E3B\u8425\u4E1A\u52A1**\uFF1A${t.main_business}
- **\u884C\u4E1A\u5206\u7C7B**\uFF1A${t.industry||"\u5F85\u8865\u5145"}

---

## \u4E8C\u3001\u53D1\u5C55\u5386\u7A0B

${t.history||`### \u521B\u7ACB\u9636\u6BB5

[\u5F85\u8865\u5145]

### \u6210\u957F\u9636\u6BB5

[\u5F85\u8865\u5145]

### \u73B0\u72B6

[\u5F85\u8865\u5145]`}

---

## \u4E09\u3001\u6838\u5FC3\u4E1A\u52A1/\u6A21\u5F0F

${t.core_business||"[\u5F85\u8865\u5145]"}

---

## \u56DB\u3001\u5173\u952E\u4EBA\u7269

${a||"- [\u5F85\u8865\u5145]"}

---

## \u4E94\u3001\u91CD\u8981\u4E8B\u4EF6/\u6848\u4F8B

${c}

---

## \u516D\u3001\u76F8\u5173\u77E5\u8BC6\u70B9

${p||"- [\u5F85\u8865\u5145]"}

---

## \u4E03\u3001\u539F\u6587\u51FA\u5904

> \u26A0\uFE0F \u94FE\u63A5\u89C4\u8303\uFF1A\u5FC5\u987B\u4F7F\u7528 Obsidian \u53CC\u5411\u94FE\u63A5 [[\u8DEF\u5F84]] \u8BED\u6CD5

${l||"- [\u5F85\u8865\u5145]"}

---

## \u516B\u3001\u6700\u65B0\u52A8\u6001

[\u5F85\u8865\u5145]

---

## \u4E5D\u3001\u66F4\u65B0\u65E5\u5FD7

| \u65E5\u671F | \u64CD\u4F5C\u7C7B\u578B | \u89E6\u53D1\u6765\u6E90 | \u53D8\u66F4\u5185\u5BB9 |
|------|---------|---------|----------|
| ${s} | \u521B\u5EFA | \u7528\u6237\u6307\u4EE4 | \u521D\u59CB\u5316\u9875\u9762 |
`,g=`${n}/${t.name}.md`,h=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(g));return h&&h instanceof r.TFile?{success:!1,content:`\u7EC4\u7EC7\u6863\u6848\u9875\u9762\u5DF2\u5B58\u5728\uFF0C\u7981\u6B62\u8986\u76D6\uFF1A${g}\u3002\u8BF7\u4F7F\u7528 update_knowledge_page \u8FFD\u52A0\u5185\u5BB9\u3002`}:(await this.createFileOnly(g,u),{success:!0,content:`\u7EC4\u7EC7\u6863\u6848\u9875\u9762\u5DF2\u521B\u5EFA: ${g}

\u8BF7\u7EE7\u7EED\u6267\u884C\uFF1A
1. \u4F7F\u7528 update_index \u5DE5\u5177\u66F4\u65B0\u7D22\u5F15
2. \u5728\u81F3\u5C113\u4E2A\u5DF2\u6709\u9875\u9762\u4E2D\u6DFB\u52A0\u5165\u94FE
3. \u8FFD\u52A0\u66F4\u65B0\u65E5\u5FD7`})}catch(t){return{success:!1,content:`\u521B\u5EFA\u7EC4\u7EC7\u6863\u6848\u9875\u9762\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("update_knowledge_page",{name:"update_knowledge_page",description:"\u5411\u5DF2\u6709\u7684\u77E5\u8BC6\u70B9\u9875\u9762\u8FFD\u52A0\u5185\u5BB9\u3002\u4E0D\u53EF\u66FF\u6362\u6216\u5220\u9664\u5DF2\u6709\u5185\u5BB9",parameters:{type:"object",properties:{path:{type:"string",description:"\u77E5\u8BC6\u70B9\u9875\u9762\u7684\u8DEF\u5F84"},section:{type:"string",description:"\u8981\u66F4\u65B0\u7684\u7AE0\u8282\u6838\u5FC3\u540D\u79F0\uFF0C\u5982\uFF1A\u6838\u5FC3\u5B9A\u4E49\u3001\u6838\u5FC3\u8981\u70B9\u3001\u7ECF\u5178\u6848\u4F8B\u3001\u5B9E\u8DF5\u65B9\u6CD5\u3001\u5E38\u89C1\u8BEF\u533A\u3001\u76F8\u5173\u77E5\u8BC6\u70B9\u3001\u539F\u6587\u51FA\u5904\u3001\u542F\u793A\u3001\u66F4\u65B0\u65E5\u5FD7"},content:{type:"string",description:"\u8981\u8FFD\u52A0\u7684\u7AE0\u8282\u5185\u5BB9\uFF08\u53EA\u5199\u7AE0\u8282\u5185\u5BB9\u672C\u8EAB\uFF0C\u4E0D\u5305\u542B\u7AE0\u8282\u6807\u9898\uFF09"},append_mode:{type:"string",description:"\u56FA\u5B9A\u4E3A append\uFF08\u5728\u7AE0\u8282\u672B\u5C3E\u8FFD\u52A0\u5185\u5BB9\uFF09\u3002\u6CE8\u610F\uFF1A\u4E0D\u652F\u6301 replace\uFF0C\u4E0D\u5F97\u5220\u9664\u5DF2\u6709\u5185\u5BB9",enum:["append"]}},required:["path","section","content"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(t.path),n=this.app.vault.getAbstractFileByPath(e);if(!n||!(n instanceof r.TFile))return{success:!1,content:`\u6587\u4EF6\u4E0D\u5B58\u5728: ${e}`};let s=await this.app.vault.read(n),c={\u6838\u5FC3\u5B9A\u4E49:["\u6838\u5FC3\u5B9A\u4E49","\u6838\u5FC3\u5B9A\u4E49"],\u6838\u5FC3\u8981\u70B9:["\u6838\u5FC3\u8981\u70B9","\u8981\u70B9"],\u7ECF\u5178\u6848\u4F8B:["\u7ECF\u5178\u6848\u4F8B","\u6848\u4F8B"],\u5B9E\u8DF5\u65B9\u6CD5:["\u5B9E\u8DF5\u65B9\u6CD5","\u65B9\u6CD5"],\u5E38\u89C1\u8BEF\u533A:["\u5E38\u89C1\u8BEF\u533A","\u8BEF\u533A"],\u76F8\u5173\u77E5\u8BC6\u70B9:["\u76F8\u5173\u77E5\u8BC6\u70B9","\u5173\u8054"],\u539F\u6587\u51FA\u5904:["\u539F\u6587\u51FA\u5904","\u51FA\u5904"],\u542F\u793A:["\u542F\u793A","\u5BF9\u76EE\u6807\u4EBA\u7FA4\u7684\u542F\u793A"],\u66F4\u65B0\u65E5\u5FD7:["\u66F4\u65B0\u65E5\u5FD7","\u65E5\u5FD7"]}[t.section]||[t.section],a=-1,p="";for(let T of c){let v=new RegExp(`##\\s*[\\d\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u3001\\.]*\\s*${T.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`),b=s.match(v);if(b){a=b.index,p=b[0];break}}if(a===-1){let T=new RegExp(`##\\s*[\\d\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u3001\\.]*\\s*${t.section.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`),v=s.match(T);if(v)a=v.index,p=v[0];else return{success:!1,content:`\u672A\u627E\u5230\u7AE0\u8282\u300C${t.section}\u300D\u3002\u6587\u4EF6\u4E2D\u7684\u7AE0\u8282\u6807\u9898\u683C\u5F0F\u53EF\u80FD\u4E0D\u540C\uFF0C\u8BF7\u5148\u4F7F\u7528 read_vault_file \u8BFB\u53D6\u6587\u4EF6\u67E5\u770B\u5B9E\u9645\u7AE0\u8282\u540D\u79F0`}}let l=s.indexOf(`
## `,a+p.length),u=l===-1?s.length:l,g=s.substring(0,a),h=s.substring(u),d=s.substring(a,u),m=g+d+`

`+t.content+h,f=`| ${new Date().toISOString().split("T")[0]} | \u4FEE\u6539 | \u7528\u6237\u6307\u4EE4 | \u66F4\u65B0${t.section}\u7AE0\u8282 |`,y=/##\s*[一二三四五六七八九十、]*\s*更新日志/,C=m.match(y);if(C){let T=C.index,v=m.indexOf("| \u65E5\u671F |",T);if(v!==-1){let b=m.indexOf(`
`,v),P=m.indexOf(`
`,b+1);m=m.substring(0,P+1)+f+`
`+m.substring(P+1)}}return await this.app.vault.modify(n,m),{success:!0,content:`\u7AE0\u8282\u300C${t.section}\u300D\u5DF2\u66F4\u65B0: ${e}

\u8BF7\u6267\u884C\u81EA\u68C0\u6E05\u5355\u5E76\u66F4\u65B0\u96C6\u4E2D\u65E5\u5FD7\u3002`}}catch(t){return{success:!1,content:`\u66F4\u65B0\u77E5\u8BC6\u70B9\u9875\u9762\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("update_index",{name:"update_index",description:"\u66F4\u65B0\u77E5\u8BC6\u5E93\u7D22\u5F15\u6587\u4EF6\uFF08\u603B\u7D22\u5F15\u3001\u5173\u952E\u8BCD\u7D22\u5F15\u3001\u5173\u7CFB\u56FE\u8C31\uFF09",parameters:{type:"object",properties:{action:{type:"string",description:"\u66F4\u65B0\u7C7B\u578B",enum:["add_entry","refresh_all"]},entry_name:{type:"string",description:"\u6761\u76EE\u540D\u79F0"},entry_category:{type:"string",description:"\u6761\u76EE\u5206\u7C7B"},entry_description:{type:"string",description:"\u4E00\u53E5\u8BDD\u63CF\u8FF0"},entry_maturity:{type:"string",description:"\u6210\u719F\u5EA6",enum:["\u{1F7E2}","\u{1F7E1}","\u{1F534}"]},keywords:{type:"string",description:"\u65B0\u589E\u5173\u952E\u8BCD\uFF0C\u9017\u53F7\u5206\u9694"}},required:["action"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(this.settings.knowledgeBasePath),n=`${e}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,s=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(n));if(!s||!(s instanceof r.TFile))return{success:!1,content:`\u7D22\u5F15\u6587\u4EF6\u4E0D\u5B58\u5728: ${n}`};if(t.action==="add_entry"&&t.entry_name&&t.entry_category){let o=await this.app.vault.read(s),c=t.entry_category,a=new RegExp(`###\\s+\\d+\\.\\s+${c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*\\(\\d+\u4E2A\\)`),p=o.match(a);if(p){let l=o.indexOf(p[0]),u=o.indexOf(`
### `,l+1),g=u===-1?o.indexOf(`
---`,l):u,h=o.substring(l,g),d=h.match(/\((\d+)个\)/),m=d?parseInt(d[1]):0,w=m+1,f=h.replace(`(${m}\u4E2A)`,`(${w}\u4E2A)`).replace(/（暂无知识点）/,""),y=t.entry_maturity||"\u{1F7E1}",C=`- [[${t.entry_name}]] ${y} - ${t.entry_description||"\u5F85\u8865\u5145"}`,T=o.substring(0,l)+f.trimEnd()+`
`+C+`
`+o.substring(g);await this.app.vault.modify(s,T);let v=T.match(/知识点总数：(\d+)个/);if(v){let b=parseInt(v[1])+1,P=T.replace(`\u77E5\u8BC6\u70B9\u603B\u6570\uFF1A${v[1]}\u4E2A`,`\u77E5\u8BC6\u70B9\u603B\u6570\uFF1A${b}\u4E2A`);await this.app.vault.modify(s,P)}}if(t.keywords){let l=`${e}/20-\u77E5\u8BC6\u7D22\u5F15/\u5173\u952E\u8BCD\u7D22\u5F15.md`,u=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(l));if(u&&u instanceof r.TFile){let g=await this.app.vault.read(u),h=t.keywords.split(",").map(m=>`| ${m.trim()} | [[${t.entry_name}]] | 1 |`).join(`
`),d=g.replace("\uFF08\u6682\u65E0\u5173\u952E\u8BCD\uFF09",h);await this.app.vault.modify(u,d)}}return{success:!0,content:`\u7D22\u5F15\u5DF2\u66F4\u65B0\uFF1A\u6DFB\u52A0 ${t.entry_name} \u5230 ${t.entry_category}`}}return t.action==="refresh_all"?{success:!0,content:"\u8BF7\u4F7F\u7528 list_vault_folder \u5DE5\u5177\u626B\u63CF\u5404\u5206\u7C7B\u76EE\u5F55\uFF0C\u7136\u540E\u624B\u52A8\u66F4\u65B0\u7D22\u5F15\u6570\u91CF\u3002"}:{success:!0,content:"\u7D22\u5F15\u66F4\u65B0\u64CD\u4F5C\u5B8C\u6210"}}catch(t){return{success:!1,content:`\u66F4\u65B0\u7D22\u5F15\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("query_knowledge",{name:"query_knowledge",description:"\u67E5\u8BE2\u77E5\u8BC6\u5E93\uFF1A\u5148\u8BFB\u53D6\u7D22\u5F15\u4E86\u89E3\u7ED3\u6784\uFF0C\u518D\u8BFB\u53D6\u76F8\u5173\u77E5\u8BC6\u70B9\u9875\u9762",parameters:{type:"object",properties:{query:{type:"string",description:"\u67E5\u8BE2\u95EE\u9898\u6216\u5173\u952E\u8BCD"}},required:["query"]},execute:async i=>{try{let t=this.strArgs(i),n=`${(0,r.normalizePath)(this.settings.knowledgeBasePath)}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,s=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(n));if(!s||!(s instanceof r.TFile))return{success:!1,content:`\u77E5\u8BC6\u5E93\u7D22\u5F15\u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u521D\u59CB\u5316\u77E5\u8BC6\u5E93\u3002\u7D22\u5F15\u8DEF\u5F84: ${n}`};let o=await this.app.vault.read(s),c=t.query.toLowerCase(),a=o.split(`
`),p=[];for(let u of a)u.includes("[[")&&u.toLowerCase().includes(c.split(" ")[0])&&p.push(u.trim());let l=`\u77E5\u8BC6\u5E93\u7D22\u5F15\u6982\u89C8:
${o.substring(0,2e3)}

`;return p.length>0?l+=`\u4E0E "${t.query}" \u76F8\u5173\u7684\u6761\u76EE:
${p.join(`
`)}

`:l+=`\u5728\u7D22\u5F15\u4E2D\u672A\u627E\u5230\u4E0E "${t.query}" \u76F4\u63A5\u5339\u914D\u7684\u6761\u76EE\u3002

`,l+="\u8BF7\u6839\u636E\u4EE5\u4E0A\u7D22\u5F15\u4FE1\u606F\uFF0C\u4F7F\u7528 read_vault_file \u5DE5\u5177\u8BFB\u53D6\u76F8\u5173\u77E5\u8BC6\u70B9\u9875\u9762\u7684\u8BE6\u7EC6\u5185\u5BB9\u6765\u56DE\u7B54\u7528\u6237\u95EE\u9898\u3002",{success:!0,content:l}}catch(t){return{success:!1,content:`\u67E5\u8BE2\u77E5\u8BC6\u5E93\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("lint_knowledge_base",{name:"lint_knowledge_base",description:"\u5BF9\u77E5\u8BC6\u5E93\u6267\u884C\u6574\u7406\u68C0\u67E5\uFF1A\u68C0\u67E5\u77DB\u76FE\u3001\u5B64\u7ACB\u9875\u9762\u3001\u683C\u5F0F\u95EE\u9898\u7B49",parameters:{type:"object",properties:{check_type:{type:"string",description:"\u68C0\u67E5\u7C7B\u578B",enum:["full","format","content","links"]}},required:[]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(this.settings.knowledgeBasePath),n=t.check_type||"full",s=[],o=`${e}/10-\u77E5\u8BC6\u70B9\u5E93`,c=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(o));if(!c||!(c instanceof r.TFolder))return{success:!1,content:`\u77E5\u8BC6\u70B9\u5E93\u76EE\u5F55\u4E0D\u5B58\u5728: ${o}`};let a=[],p=[],l=new Set,u=h=>{for(let d of h.children)d instanceof r.TFile?(a.push(d),l.add(d.basename),d.stat.size===0&&p.push(d)):d instanceof r.TFolder&&u(d)};if(u(c),p.length>0&&s.push(`\u26A0\uFE0F \u53D1\u73B0 ${p.length} \u4E2A\u7A7A\u6587\u4EF6:
${p.map(h=>`  - ${h.path}`).join(`
`)}`),n==="full"||n==="links"){let h=[],d=new Set;for(let m of a.slice(0,50)){let f=(await this.app.vault.cachedRead(m)).matchAll(/\[\[([^\]]+)\]\]/g);for(let y of f)d.add(y[1].split("|")[0].split("#")[0].trim())}for(let m of l)d.has(m)||h.push(m);h.length>0&&s.push(`\u{1F517} \u53D1\u73B0 ${h.length} \u4E2A\u5B64\u7ACB\u9875\u9762\uFF08\u65E0\u5165\u94FE\uFF09:
${h.slice(0,20).map(m=>`  - ${m}`).join(`
`)}`)}if(n==="full"||n==="format")for(let h of a.slice(0,30)){let d=await this.app.vault.cachedRead(h);d.includes("## \u4E5D\u3001\u66F4\u65B0\u65E5\u5FD7")||s.push(`\u{1F4DD} ${h.basename} \u7F3A\u5C11"\u66F4\u65B0\u65E5\u5FD7"\u7AE0\u8282`),d.includes("## \u4E03\u3001\u539F\u6587\u51FA\u5904")||s.push(`\u{1F4DD} ${h.basename} \u7F3A\u5C11"\u539F\u6587\u51FA\u5904"\u7AE0\u8282`)}if(n==="full"||n==="content"){let h=`${e}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,d=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(h));if(d&&d instanceof r.TFile){let w=(await this.app.vault.read(d)).matchAll(/\((\d+)个\)/g);for(let f of w)parseInt(f[1])>0&&s.push(`\u{1F4CA} \u5206\u7C7B\u8BA1\u6570 ${f[0]} \u9700\u8981\u9A8C\u8BC1\u662F\u5426\u4E0E\u5B9E\u9645\u6587\u4EF6\u6570\u4E00\u81F4`)}}return{success:!0,content:s.length>0?`Lint \u68C0\u67E5\u5B8C\u6210\uFF0C\u53D1\u73B0 ${s.length} \u4E2A\u95EE\u9898:

${s.join(`

`)}

\u8BF7\u6839\u636E\u4EE5\u4E0A\u95EE\u9898\u9010\u4E00\u4FEE\u590D\u3002`:`Lint \u68C0\u67E5\u5B8C\u6210\uFF0C\u672A\u53D1\u73B0\u660E\u663E\u95EE\u9898\u3002\u77E5\u8BC6\u5E93\u72B6\u6001\u826F\u597D\uFF01

\u5171\u68C0\u67E5 ${a.length} \u4E2A\u6587\u4EF6\u3002`}}catch(t){return{success:!1,content:`Lint \u68C0\u67E5\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("get_knowledge_base_status",{name:"get_knowledge_base_status",description:"\u83B7\u53D6\u77E5\u8BC6\u5E93\u5F53\u524D\u72B6\u6001\uFF1A\u6587\u4EF6\u6570\u91CF\u3001\u6210\u719F\u5EA6\u5206\u5E03\u3001\u6700\u8FD1\u66F4\u65B0\u7B49",parameters:{type:"object",properties:{},required:[]},execute:async()=>{try{let i=(0,r.normalizePath)(this.settings.knowledgeBasePath),t=this.app.vault.getAbstractFileByPath(i);if(!t||!(t instanceof r.TFolder))return{success:!1,content:`\u77E5\u8BC6\u5E93\u5C1A\u672A\u521D\u59CB\u5316\u3002\u8DEF\u5F84: ${i}

\u8BF7\u4F7F\u7528 init_knowledge_base \u5DE5\u5177\u521D\u59CB\u5316\u77E5\u8BC6\u5E93\u3002`};let e={},n={"\u{1F7E2}":0,"\u{1F7E1}":0,"\u{1F534}":0},s=u=>{let g=0;for(let h of u.children)h instanceof r.TFile?g++:h instanceof r.TFolder&&(g+=s(h));return g};for(let u of t.children)u instanceof r.TFolder&&(e[u.name]=s(u));let o=`${i}/10-\u77E5\u8BC6\u70B9\u5E93`,c=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(o));if(c&&c instanceof r.TFolder){for(let u of c.children)if(u instanceof r.TFolder){for(let g of u.children)if(g instanceof r.TFile){let h=await this.app.vault.cachedRead(g);h.includes("\u{1F7E2}")?n["\u{1F7E2}"]++:h.includes("\u{1F7E1}")?n["\u{1F7E1}"]++:h.includes("\u{1F534}")&&n["\u{1F534}"]++}}}let a=`${i}/20-\u77E5\u8BC6\u7D22\u5F15/\u77E5\u8BC6\u5E93\u603B\u7D22\u5F15.md`,p=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(a)),l="\u672A\u77E5";return p&&p instanceof r.TFile&&(l=new Date(p.stat.mtime).toLocaleString("zh-CN")),{success:!0,content:`\u{1F4CA} \u77E5\u8BC6\u5E93\u72B6\u6001\u62A5\u544A

\u8DEF\u5F84: ${i}
\u6700\u540E\u66F4\u65B0: ${l}

\u{1F4C1} \u76EE\u5F55\u7EDF\u8BA1:
${Object.entries(e).map(([u,g])=>`  - ${u}: ${g} \u4E2A\u6587\u4EF6`).join(`
`)}

\u{1F4C8} \u6210\u719F\u5EA6\u5206\u5E03:
  - \u{1F7E2} \u5B8C\u6574\u7EA7: ${n["\u{1F7E2}"]}\u4E2A
  - \u{1F7E1} \u57FA\u7840\u7EA7: ${n["\u{1F7E1}"]}\u4E2A
  - \u{1F534} \u6846\u67B6\u7EA7: ${n["\u{1F534}"]}\u4E2A`}}catch(i){return{success:!1,content:`\u83B7\u53D6\u77E5\u8BC6\u5E93\u72B6\u6001\u5931\u8D25: ${this.getErrorMessage(i)}`}}}}),this.tools.set("record_conflict",{name:"record_conflict",description:"\u8BB0\u5F55\u77E5\u8BC6\u70B9\u4E4B\u95F4\u7684\u77DB\u76FE/\u51B2\u7A81",parameters:{type:"object",properties:{old_info:{type:"string",description:"\u65E7\u4FE1\u606F"},new_info:{type:"string",description:"\u65B0\u4FE1\u606F"},old_source:{type:"string",description:"\u65E7\u4FE1\u606F\u6765\u6E90\u8DEF\u5F84"},new_source:{type:"string",description:"\u65B0\u4FE1\u606F\u6765\u6E90\u8DEF\u5F84"},resolution:{type:"string",description:"\u5904\u7406\u65B9\u5F0F",enum:["\u6807\u6CE8\u77DB\u76FE","\u4EE5\u65B0\u4E3A\u51C6","\u9700\u9A8C\u8BC1"]}},required:["old_info","new_info"]},execute:async i=>{try{let t=this.strArgs(i),n=`${(0,r.normalizePath)(this.settings.knowledgeBasePath)}/30-\u7EF4\u62A4\u8BB0\u5F55/\u51B2\u7A81\u4E0E\u9519\u8BEF\u8BB0\u5F55.md`,s=new Date().toISOString().split("T")[0],o=`
## \u26A0\uFE0F \u77E5\u8BC6\u70B9\u77DB\u76FE\u8BB0\u5F55 (${s})

**\u77DB\u76FE\u5185\u5BB9**\uFF1A
- \u65E7\u4FE1\u606F\uFF1A${t.old_info}
- \u65B0\u4FE1\u606F\uFF1A${t.new_info}

**\u77DB\u76FE\u6765\u6E90**\uFF1A
- \u65E7\uFF1A[[${t.old_source||"\u5F85\u8865\u5145"}]]
- \u65B0\uFF1A[[${t.new_source||"\u5F85\u8865\u5145"}]]

**\u5904\u7406\u65B9\u5F0F**\uFF1A${t.resolution||"\u6807\u6CE8\u77DB\u76FE"}
**\u8BB0\u5F55\u65F6\u95F4**\uFF1A${s}

---
`,c=this.app.vault.getAbstractFileByPath((0,r.normalizePath)(n));if(c&&c instanceof r.TFile){let a=await this.app.vault.read(c);await this.app.vault.modify(c,a+o)}else await this.createFileOnly(n,`# \u51B2\u7A81\u4E0E\u9519\u8BEF\u8BB0\u5F55

${o}`);return{success:!0,content:`\u51B2\u7A81\u5DF2\u8BB0\u5F55\u5230: ${n}`}}catch(t){return{success:!1,content:`\u8BB0\u5F55\u51B2\u7A81\u5931\u8D25: ${this.getErrorMessage(t)}`}}}})}registerMemoryTools(){this.tools.set("save_memory",{name:"save_memory",description:"\u4FDD\u5B58\u957F\u671F\u8BB0\u5FC6\uFF08\u7ECF\u9A8C\u3001\u6D1E\u5BDF\u3001\u65B9\u6CD5\u8BBA\uFF09",parameters:{type:"object",properties:{category:{type:"string",description:"\u8BB0\u5FC6\u5206\u7C7B\uFF0C\u5982\uFF1A\u9009\u9898\u7ECF\u9A8C\u3001\u8BBE\u8BA1\u6280\u5DE7\u3001\u5DE5\u4F5C\u65B9\u6CD5"},content:{type:"string",description:"\u8BB0\u5FC6\u5185\u5BB9"}},required:["category","content"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(`${this.settings.memoryFolder}/\u957F\u671F\u8BB0\u5FC6.md`),n=this.app.vault.getAbstractFileByPath(e),s=new Date().toISOString().split("T")[0],o=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}),c=`
### [${t.category}] ${s} ${o}
${t.content}
`;if(n&&n instanceof r.TFile){let a=await this.app.vault.read(n);await this.app.vault.modify(n,a+c)}else await this.ensureFolder(this.settings.memoryFolder),await this.createFileOnly(e,`# \u957F\u671F\u8BB0\u5FC6

> Agent \u7684\u957F\u671F\u8BB0\u5FC6\uFF0C\u8BB0\u5F55\u5173\u952E\u7ECF\u9A8C\u3001\u7528\u6237\u504F\u597D\u548C\u8FD0\u8425\u7B56\u7565
${c}`);return{success:!0,content:`\u8BB0\u5FC6\u5DF2\u4FDD\u5B58\u5230: ${e}`}}catch(t){return{success:!1,content:`\u4FDD\u5B58\u8BB0\u5FC6\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("save_preference",{name:"save_preference",description:"\u4FDD\u5B58\u7528\u6237\u504F\u597D\uFF08\u98CE\u683C\u504F\u597D\u3001\u4E60\u60EF\u8981\u6C42\u7B49\uFF09",parameters:{type:"object",properties:{key:{type:"string",description:"\u504F\u597D\u952E\u540D\uFF0C\u5982\uFF1A\u5199\u4F5C\u98CE\u683C\u3001\u77E5\u8BC6\u5E93\u5206\u7C7B\u504F\u597D"},value:{type:"string",description:"\u504F\u597D\u503C"}},required:["key","value"]},execute:async i=>{try{let t=this.strArgs(i),e=(0,r.normalizePath)(`${this.settings.memoryFolder}/\u7528\u6237\u504F\u597D.md`),n=this.app.vault.getAbstractFileByPath(e),s=new Date().toISOString().split("T")[0];if(n&&n instanceof r.TFile){let c=(await this.app.vault.read(n)).split(`
`),a=c.findIndex(p=>p.startsWith(`- **${t.key}**:`));a>=0?c[a]=`- **${t.key}**: ${t.value} (_${s}_)`:c.push(`- **${t.key}**: ${t.value} (_${s}_)`),await this.app.vault.modify(n,c.join(`
`))}else await this.ensureFolder(this.settings.memoryFolder),await this.createFileOnly(e,`# \u7528\u6237\u504F\u597D

> Agent \u8BB0\u5F55\u7684\u7528\u6237\u504F\u597D\u548C\u4E60\u60EF

- **${t.key}**: ${t.value} (_${s}_)
`);return{success:!0,content:`\u504F\u597D\u5DF2\u4FDD\u5B58: ${t.key} = ${t.value}`}}catch(t){return{success:!1,content:`\u4FDD\u5B58\u504F\u597D\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("write_log",{name:"write_log",description:"\u5199\u5165\u5DE5\u4F5C\u65E5\u5FD7",parameters:{type:"object",properties:{title:{type:"string",description:"\u65E5\u5FD7\u6807\u9898"},content:{type:"string",description:"\u65E5\u5FD7\u5185\u5BB9"}},required:["title","content"]},execute:async i=>{try{let t=this.strArgs(i),e=new Date().toISOString().split("T")[0],n=(0,r.normalizePath)(`${this.settings.memoryFolder}/\u65E5\u5FD7/${e}.md`),s=this.app.vault.getAbstractFileByPath(n),o=`
## ${new Date().toLocaleTimeString("zh-CN")} | ${t.title}

${t.content}

---
`;if(s&&s instanceof r.TFile){let c=await this.app.vault.read(s);await this.app.vault.modify(s,c+o)}else await this.ensureFolder(`${this.settings.memoryFolder}/\u65E5\u5FD7`),await this.createFileOnly(n,`# \u5DE5\u4F5C\u65E5\u5FD7 ${e}

${o}`);return{success:!0,content:`\u65E5\u5FD7\u5DF2\u5199\u5165: ${n}`}}catch(t){return{success:!1,content:`\u5199\u5165\u65E5\u5FD7\u5931\u8D25: ${this.getErrorMessage(t)}`}}}}),this.tools.set("read_memory",{name:"read_memory",description:"\u8BFB\u53D6\u957F\u671F\u8BB0\u5FC6\u548C\u7528\u6237\u504F\u597D",parameters:{type:"object",properties:{},required:[]},execute:async()=>{try{let i=[],t=(0,r.normalizePath)(`${this.settings.memoryFolder}/\u957F\u671F\u8BB0\u5FC6.md`),e=this.app.vault.getAbstractFileByPath(t);e&&e instanceof r.TFile&&i.push(await this.app.vault.read(e));let n=(0,r.normalizePath)(`${this.settings.memoryFolder}/\u7528\u6237\u504F\u597D.md`),s=this.app.vault.getAbstractFileByPath(n);return s&&s instanceof r.TFile&&i.push(await this.app.vault.read(s)),{success:!0,content:i.length>0?i.join(`

---

`):"\u6682\u65E0\u8BB0\u5FC6\u8BB0\u5F55"}}catch(i){return{success:!1,content:`\u8BFB\u53D6\u8BB0\u5FC6\u5931\u8D25: ${this.getErrorMessage(i)}`}}}})}getToolDefinitions(){let i=[];for(let[,t]of this.tools)i.push({type:"function",function:{name:t.name,description:t.description,parameters:t.parameters}});return i}async executeTool(i,t){let e=this.tools.get(i);return e?await e.execute(t):{success:!1,content:`\u672A\u77E5\u5DE5\u5177: ${i}`}}async ensureFolder(i){if(!i)return;let t=(0,r.normalizePath)(i).split("/"),e="";for(let n of t)e=e?`${e}/${n}`:n,this.app.vault.getAbstractFileByPath(e)||await this.app.vault.createFolder(e)}async createFileOnly(i,t){let e=(0,r.normalizePath)(i);if(this.isUnderRawMaterials(e))return;let s=this.app.vault.getAbstractFileByPath(e);s&&s instanceof r.TFile||await this.app.vault.create(e,t)}isUnderRawMaterials(i){let t=(0,r.normalizePath)(this.settings.knowledgeBasePath),e=(0,r.normalizePath)(i),n=`${t}/00-\u539F\u59CB\u8D44\u6599`;return e===n||e.startsWith(n+"/")?e:null}};var x=require("obsidian"),S="llm-wiki-chat-view",O=class extends x.ItemView{constructor(t,e){super(t);this.isProcessing=!1;this.currentAssistantEl=null;this.currentContent="";this.renderTimer=null;this.tokenBuffer="";this.toolCardEl=null;this.plugin=e}getViewType(){return S}getDisplayText(){return"LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B"}getIcon(){return"message-square"}async onOpen(){let t=this.containerEl.children[1];t.empty(),t.addClass("llm-wiki-root"),this.buildUI(t),await this.loadChatHistory()}onClose(){this.saveChatHistory()}buildUI(t){let e=t.createEl("div",{cls:"llm-wiki-chat-header"});e.createEl("h3",{text:"\u{1F4AC} LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B"}),e.createEl("div",{cls:"llm-wiki-header-actions"}).createEl("button",{text:"\u65B0\u5BF9\u8BDD",cls:"llm-wiki-btn"}).addEventListener("click",()=>void this.newConversation()),this.messagesEl=t.createEl("div",{cls:"llm-wiki-messages"});let o=t.createEl("div",{cls:"llm-wiki-input-container"});this.inputEl=o.createEl("textarea",{cls:"llm-wiki-input",attr:{placeholder:"\u8F93\u5165\u60A8\u7684\u95EE\u9898...",rows:"2"}}),this.inputEl.addEventListener("keydown",l=>{l.key==="Enter"&&!l.shiftKey&&(l.preventDefault(),this.sendMessage())});let c=o.createEl("div",{cls:"llm-wiki-hints"}),a=[{text:"\u521D\u59CB\u5316\u77E5\u8BC6\u5E93",tip:"\u521B\u5EFA\u4E13\u9898\u77E5\u8BC6\u5E93\u76EE\u5F55\u7ED3\u6784"},{text:"\u6444\u53D6\u8D44\u6599",tip:"\u5904\u7406\u539F\u59CB\u8D44\u6599\u6587\u4EF6"},{text:"\u67E5\u8BE2\u77E5\u8BC6",tip:"\u641C\u7D22\u77E5\u8BC6\u5E93\u5185\u5BB9"},{text:"Lint \u68C0\u67E5",tip:"\u6267\u884C\u6574\u7406\u68C0\u67E5"},{text:"\u77E5\u8BC6\u5E93\u72B6\u6001",tip:"\u67E5\u770B\u77E5\u8BC6\u5E93\u6982\u51B5"}];for(let l of a)c.createEl("span",{cls:"llm-wiki-hint-chip",text:l.text,attr:{title:l.tip}}).addEventListener("click",()=>{this.inputEl.value=l.text,this.inputEl.focus()});let p=o.createEl("div",{cls:"llm-wiki-btn-row"});this.sendBtn=p.createEl("button",{text:"\u53D1\u9001",cls:"llm-wiki-btn llm-wiki-btn-primary"}),this.sendBtn.addEventListener("click",()=>void this.sendMessage()),this.stopBtn=p.createEl("button",{text:"\u505C\u6B62",cls:"llm-wiki-btn llm-wiki-btn-danger"}),this.stopBtn.addClass("llm-wiki-hidden"),this.stopBtn.addEventListener("click",()=>this.stopGeneration())}async newConversation(){var t;this.isProcessing||((t=this.plugin.agentCore)==null||t.clearHistory(),this.messagesEl.empty(),this.currentContent="",this.tokenBuffer="",this.addSystemMessage(`\u65B0\u5BF9\u8BDD\u5DF2\u5F00\u59CB\u3002\u60A8\u53EF\u4EE5\u8F93\u5165\u95EE\u9898\uFF0C\u6216\u5C1D\u8BD5\u4EE5\u4E0B\u6307\u4EE4\uFF1A

\u2022 **'\u521D\u59CB\u5316\u77E5\u8BC6\u5E93'** - \u521B\u5EFA\u4E13\u9898\u77E5\u8BC6\u5E93\u76EE\u5F55\u7ED3\u6784
\u2022 **'\u6444\u53D6'** - \u5904\u7406\u539F\u59CB\u8D44\u6599
\u2022 **'\u67E5\u8BE2'** - \u641C\u7D22\u77E5\u8BC6\u5E93
\u2022 **'Lint'** - \u6267\u884C\u6574\u7406\u68C0\u67E5
\u2022 **'\u521B\u5EFA\u77E5\u8BC6\u70B9'** - \u65B0\u5EFA\u77E5\u8BC6\u70B9\u9875\u9762
\u2022 **'\u77E5\u8BC6\u5E93\u72B6\u6001'** - \u67E5\u770B\u77E5\u8BC6\u5E93\u6982\u51B5`))}async sendMessage(){let t=this.inputEl.value.trim();if(!(!t||this.isProcessing)){this.inputEl.value="",this.isProcessing=!0,this.sendBtn.addClass("llm-wiki-hidden"),this.stopBtn.removeClass("llm-wiki-hidden"),this.addUserMessage(t),this.addAssistantMessage("");try{let e=this.plugin.agentCore;if(!e){this.updateAssistantMessage("\u274C Agent \u672A\u521D\u59CB\u5316\uFF0C\u8BF7\u68C0\u67E5 API Key \u8BBE\u7F6E\u3002");return}let n=async s=>{this.finalizeAssistantMessage(),this.autoLog(t,s),await this.saveChatHistory()};this.plugin.settings.streamMode?await e.chatStream(t,{onToken:s=>this.appendToken(s),onToolCall:(s,o)=>this.showToolCall(s,o),onToolResult:(s,o)=>this.showToolResult(s,o),onComplete:s=>{n(s)},onError:s=>{this.updateAssistantMessage(`\u274C ${s}`),this.finalizeAssistantMessage()}}):await e.chatNonStream(t,{onToken:s=>this.appendToken(s),onToolCall:(s,o)=>this.showToolCall(s,o),onToolResult:(s,o)=>this.showToolResult(s,o),onComplete:s=>{n(s)},onError:s=>{this.updateAssistantMessage(`\u274C ${s}`),this.finalizeAssistantMessage()}})}catch(e){this.updateAssistantMessage(`\u274C \u53D1\u751F\u9519\u8BEF: ${e instanceof Error?e.message:String(e)}`)}finally{this.isProcessing=!1,this.sendBtn.removeClass("llm-wiki-hidden"),this.stopBtn.addClass("llm-wiki-hidden"),this.toolCardEl=null,this.inputEl.focus()}}}stopGeneration(){var t;(t=this.plugin.agentCore)==null||t.abort(),this.isProcessing=!1,this.sendBtn.removeClass("llm-wiki-hidden"),this.stopBtn.addClass("llm-wiki-hidden")}async addUserMessage(t){let e=this.messagesEl.createEl("div",{cls:"llm-wiki-message llm-wiki-user-message"});e.createEl("div",{cls:"llm-wiki-message-sender",text:"\u4F60"});let n=e.createEl("div",{cls:"llm-wiki-message-content"});await x.MarkdownRenderer.render(this.app,t,n,"",this),this.scrollToBottom()}addSystemMessage(t){let n=this.messagesEl.createEl("div",{cls:"llm-wiki-message llm-wiki-system-message"}).createEl("div",{cls:"llm-wiki-message-content"});x.MarkdownRenderer.render(this.app,t,n,"",this)}addAssistantMessage(t){let e=this.messagesEl.createEl("div",{cls:"llm-wiki-message llm-wiki-assistant-message"});e.createEl("div",{cls:"llm-wiki-message-sender",text:"Agent"}),this.currentAssistantEl=e.createEl("div",{cls:"llm-wiki-message-content"}),this.currentContent=t,this.tokenBuffer=""}updateAssistantMessage(t){this.currentAssistantEl&&(this.currentContent=t,this.currentAssistantEl.empty(),x.MarkdownRenderer.render(this.app,t,this.currentAssistantEl,"",this),this.scrollToBottom())}appendToken(t){this.currentContent+=t,this.tokenBuffer+=t,this.renderTimer||(this.renderTimer=window.setInterval(()=>this.flushTokenBuffer(),50)),this.scrollToBottom()}flushTokenBuffer(){this.renderTimer&&(window.clearInterval(this.renderTimer),this.renderTimer=null),this.tokenBuffer&&this.currentAssistantEl&&(this.currentAssistantEl.empty(),x.MarkdownRenderer.render(this.app,this.currentContent,this.currentAssistantEl,"",this),this.tokenBuffer="")}finalizeAssistantMessage(){this.flushTokenBuffer(),this.currentAssistantEl=null,this.currentContent=""}showToolCall(t,e){let n=JSON.stringify(e,null,2);if(this.currentAssistantEl){let s=this.currentAssistantEl.createEl("div",{cls:"llm-wiki-tool-card llm-wiki-tool-running"});s.createEl("div",{cls:"llm-wiki-tool-name",text:`\u{1F7E1} \u8C03\u7528\u5DE5\u5177: ${t}`});let o=s.createEl("pre",{cls:"llm-wiki-tool-args"});o.textContent=n,this.toolCardEl=s}this.scrollToBottom()}showToolResult(t,e){if(this.toolCardEl){let n=e.success?`\u{1F7E2} ${t} \u5B8C\u6210`:`\u{1F534} ${t} \u5931\u8D25`,s=this.toolCardEl.querySelector(".llm-wiki-tool-name");if(s&&(s.textContent=n),this.toolCardEl.removeClass("llm-wiki-tool-running"),this.toolCardEl.addClass(e.success?"llm-wiki-tool-success":"llm-wiki-tool-error"),e.content){let o=this.toolCardEl.createEl("div",{cls:"llm-wiki-tool-result"});o.textContent=e.content.length>300?e.content.substring(0,300)+"...":e.content}this.toolCardEl=null}this.scrollToBottom()}scrollToBottom(){this.messagesEl.scrollTop=this.messagesEl.scrollHeight}async autoLog(t,e){if(!(!this.plugin.settings.autoLog||!this.plugin.memoryService))try{let n=t.length>50?t.substring(0,50)+"...":t,s=e.length>200?e.substring(0,200)+"...":e;await this.plugin.memoryService.writeLog(n,`\u7528\u6237: ${t}`,s)}catch(n){}}async saveChatHistory(){var t;try{let e=(t=this.plugin.agentCore)==null?void 0:t.getHistory();if(!e||e.length===0)return;let n={messages:e,savedAt:new Date().toISOString()},s=(0,x.normalizePath)(`${this.plugin.settings.memoryFolder}/\u5BF9\u8BDD\u5386\u53F2.json`),o=this.app.vault.getAbstractFileByPath(s);o&&o instanceof x.TFile?await this.app.vault.modify(o,JSON.stringify(n,null,2)):await this.app.vault.create(s,JSON.stringify(n,null,2))}catch(e){}}async loadChatHistory(){var t;try{let e=(0,x.normalizePath)(`${this.plugin.settings.memoryFolder}/\u5BF9\u8BDD\u5386\u53F2.json`),n=this.app.vault.getAbstractFileByPath(e);if(!n||!(n instanceof x.TFile)){this.addSystemMessage(`\u6B22\u8FCE\u4F7F\u7528 LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B\uFF01

\u8BF7\u5148\u5B8C\u6210\u4EE5\u4E0B\u8BBE\u7F6E\uFF1A
1. \u5728\u8BBE\u7F6E\u4E2D\u586B\u5199 API Key\uFF08\u652F\u6301 OpenAI / DeepSeek / \u7845\u57FA\u6D41\u52A8\u7B49\uFF09
2. \u8BBE\u7F6E\u77E5\u8BC6\u5E93\u8DEF\u5F84

\u7136\u540E\u5C31\u53EF\u4EE5\u5F00\u59CB\u5BF9\u8BDD\u4E86\uFF01`);return}let s=await this.app.vault.read(n),o=JSON.parse(s),c=Array.isArray(o.messages)?o.messages:[];(t=this.plugin.agentCore)==null||t.setHistory(c);for(let a of c)a.role==="user"?this.addUserMessage(a.content):a.role==="assistant"&&!a.tool_calls&&(this.addAssistantMessage(a.content),this.updateAssistantMessage(a.content),this.finalizeAssistantMessage())}catch(e){this.addSystemMessage("\u6B22\u8FCE\u56DE\u6765\uFF01\u4E0A\u6B21\u7684\u5BF9\u8BDD\u5386\u53F2\u52A0\u8F7D\u5931\u8D25\uFF0C\u5DF2\u5F00\u542F\u65B0\u5BF9\u8BDD\u3002")}}};var k=require("obsidian"),j=class{constructor(i,t){this.app=i,this.settings=t}updateSettings(i){this.settings=i}async loadSkillContent(){try{let i=(0,k.normalizePath)(`${this.settings.skillFolderPath}/SKILL.md`),t=this.app.vault.getAbstractFileByPath(i);if(t&&t instanceof k.TFile)return await this.app.vault.read(t)}catch(i){}return""}async loadReferencesContent(){try{let i=[],t=(0,k.normalizePath)(`${this.settings.skillFolderPath}/references`),e=this.app.vault.getAbstractFileByPath(t);if(e&&e instanceof k.TFolder){for(let n of e.children)if(n instanceof k.TFile&&n.extension==="md"){let s=await this.app.vault.read(n);i.push(`### ${n.name}

${s}`)}}return i.join(`

---

`)}catch(i){}return""}async loadMemoryContext(){let i=[],t=(0,k.normalizePath)(`${this.settings.memoryFolder}/\u957F\u671F\u8BB0\u5FC6.md`),e=this.app.vault.getAbstractFileByPath(t);e&&e instanceof k.TFile&&i.push(await this.app.vault.read(e));let n=(0,k.normalizePath)(`${this.settings.memoryFolder}/\u7528\u6237\u504F\u597D.md`),s=this.app.vault.getAbstractFileByPath(n);return s&&s instanceof k.TFile&&i.push(await this.app.vault.read(s)),i.join(`

---

`)}async writeLog(i,t,e){let n=new Date().toISOString().split("T")[0],s=(0,k.normalizePath)(`${this.settings.memoryFolder}/\u65E5\u5FD7/${n}.md`),o=`## ${new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})} | ${i}

${t}

\u6458\u8981: ${e}

---
`,c=this.app.vault.getAbstractFileByPath(s);if(c&&c instanceof k.TFile){let a=await this.app.vault.read(c);await this.app.vault.modify(c,a+o)}else await this.ensureFolder(`${this.settings.memoryFolder}/\u65E5\u5FD7`),await this.app.vault.create(s,`# \u5DE5\u4F5C\u65E5\u5FD7 ${n}

${o}`)}async ensureFolder(i){if(!i)return;let t=(0,k.normalizePath)(i).split("/"),e="";for(let n of t)e=e?`${e}/${n}`:n,this.app.vault.getAbstractFileByPath(e)||await this.app.vault.createFolder(e)}};var I=class{constructor(){this.summaryCache=new Map;this.maxTokens=8e3}setMaxTokens(i){this.maxTokens=i}estimateTokens(i){return Math.ceil(i.length/2)}async compressHistory(i,t){let e=i.map(g=>g.content||"").join(`
`);if(this.estimateTokens(e)<=this.maxTokens)return i;let n=[],s=[];for(let g of i)s.push(g),g.role==="assistant"&&!g.tool_calls&&(n.push([...s]),s=[]);if(s.length>0&&n.push(s),n.length<=6)return i;let o=n.slice(-6),a=n.slice(0,-6).flat().map(g=>`${g.role}: ${g.content||""}`).join(`
`),p=this.hashText(a),l=this.summaryCache.get(p);if(!l)try{l=await t([{role:"system",content:"\u5C06\u4EE5\u4E0B\u5BF9\u8BDD\u5386\u53F2\u538B\u7F29\u4E3A\u4E00\u6BB5\u7B80\u6D01\u7684\u6458\u8981\uFF0C\u4FDD\u7559\u5173\u952E\u4FE1\u606F\u3001\u51B3\u7B56\u548C\u7ED3\u8BBA\uFF0C\u4E0D\u8D85\u8FC7500\u5B57\u3002\u5982\u679C\u6D89\u53CA\u77E5\u8BC6\u70B9\u5E93\u7684\u64CD\u4F5C\uFF0C\u4FDD\u7559\u6587\u4EF6\u8DEF\u5F84\u548C\u64CD\u4F5C\u7C7B\u578B\u3002"},{role:"user",content:a}]),this.summaryCache.set(p,l)}catch(g){l=`[\u65E9\u671F\u5BF9\u8BDD\u6458\u8981: ${a.substring(0,500)}...]`}return[{role:"assistant",content:`[\u5386\u53F2\u5BF9\u8BDD\u6458\u8981]
${l}`},...o.flat()]}hashText(i){let t=0;for(let e=0;e<i.length;e++){let n=i.charCodeAt(e);t=(t<<5)-t+n,t|=0}return`ctx_${t.toString(36)}`}getSummaryStats(i){let t=i.map(e=>e.content||"").join(`
`);return{originalTokens:this.estimateTokens(t),compressedTokens:Math.ceil(t.length/3),turns:i.filter(e=>e.role==="user").length}}};var R=class extends D.Plugin{async onload(){await this.loadSettings(),this.addSettingTab(new L(this.app,this)),this.toolRegistry=new B(this.app,this.settings),this.memoryService=new j(this.app,this.settings),this.contextManager=new I,await this.initAgent(),this.registerView(S,t=>new O(t,this)),this.addCommand({id:"open-llm-wiki-chat",name:"\u6253\u5F00 LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B",callback:()=>this.activateChatView()}),this.addRibbonIcon("message-square","LLM Wiki \u77E5\u8BC6\u5E93\u52A9\u624B",()=>{this.activateChatView()}),this.applyTheme(),this.app.workspace.onLayoutReady(()=>{this.activateChatView()})}onunload(){}async initAgent(){let[t,e,n]=await Promise.all([this.memoryService.loadSkillContent(),this.memoryService.loadReferencesContent(),this.memoryService.loadMemoryContext()]);this.agentCore=new F(this.settings,this.toolRegistry),this.agentCore.init(t,e,n)}async activateChatView(){let{workspace:t}=this.app,e=t.getLeavesOfType(S)[0];if(!e){let n=t.getRightLeaf(!1);n&&(await n.setViewState({type:S,active:!0}),e=t.getLeavesOfType(S)[0])}e&&t.revealLeaf(e)}applyTheme(){try{let t=this.app.workspace.getActiveViewOfType(D.ItemView),e=t?t.containerEl.ownerDocument:window.document;e.body.classList.remove("llm-wiki-theme-dark-blue","llm-wiki-theme-warm-light","llm-wiki-theme-obsidian-red","llm-wiki-theme-lavender","llm-wiki-theme-forest-green"),e.body.classList.add(`llm-wiki-theme-${this.settings.theme}`)}catch(t){window.document.body.classList.remove("llm-wiki-theme-dark-blue","llm-wiki-theme-warm-light","llm-wiki-theme-obsidian-red","llm-wiki-theme-lavender","llm-wiki-theme-forest-green"),window.document.body.classList.add(`llm-wiki-theme-${this.settings.theme}`)}}async loadSettings(){this.settings=Object.assign({},H,await this.loadData())}async saveSettings(){await this.saveData(this.settings),await this.initAgent(),this.memoryService.updateSettings(this.settings)}};
