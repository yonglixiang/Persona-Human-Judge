// Disable raw HTML; markdown-it rejects unsafe link schemes by default.
const chatMarkdown=globalThis.markdownit?.({html:false,breaks:true,linkify:false,typographer:false});
if(chatMarkdown){
 // Conversations should not load remote tracking images.
 chatMarkdown.disable('image');
 const defaultLink=chatMarkdown.renderer.rules.link_open;
 chatMarkdown.renderer.rules.link_open=(tokens,index,options,env,self)=>{
  tokens[index].attrSet('rel','noopener noreferrer');
  return defaultLink?defaultLink(tokens,index,options,env,self):self.renderToken(tokens,index,options);
 };
}
function renderMessageMarkdown(text){
 return chatMarkdown?chatMarkdown.render(String(text)):esc(text);
}
