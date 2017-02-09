var tinytim = require('tinytim');

module.exports = function(content, file, conf) {
  // 先走一次 css 处理，
  // 如果要在 css 的流程中添加内容，请使用
  // fis.match('*.css:css')
  cssContent = fis.compile.partial(content, file, {
    ext: '.css',
    isCssLike: true
  });

  cssContent = cssContent.replace(/[\n|\r]/g, " ");
  cssContent = cssContent.replace(/'/g, '\"');
  cssContent = cssContent.replace(/\\/g, "\\\\");
  cssContent = "'" + cssContent + "'";

  var injectCssFn = tinytim.render(conf.templates.css_injector, {});
  content = tinytim.render(conf.templates[conf.template || 'requirejs_runner'], {
    cssContent: cssContent, 
    injectCssFn: injectCssFn,
    mergeStyle: mergeStyle,
    ieLimit: ieLimit
  });

  return content;
};

/*
合并style
从后往前查找可以合并的styleSheet(style 或 link)
每一个style 或 link 样式规则最多只能有4095个, 
css规则的解析是匹配的{}数量, 可能不准确, 上限设置为3900
排除包含有@import style,避免和requirejs css plugin冲突
*/
var mergeStyle = function(css){
    var rulesLength = css.match(/\{[^{}]*\}/g).length, styleSheet;
    for(var i=document.styleSheets.length-1;i>=0;--i){
      styleSheet = document.styleSheets[i];
        if((styleSheet.rules.length + rulesLength) <= 3900 
          && styleSheet.cssText.indexOf('@import') === -1
          && !styleSheet.disabled
          && !styleSheet.readOnly
          && (!styleSheet.media || styleSheet.media.length === 0)
          ){
            document.styleSheets[i].cssText += css;
            return true;
        }
    }
    return false;
}

/*
https://blogs.msdn.microsoft.com/ieinternals/2011/05/14/stylesheet-limits-in-internet-explorer/
兼容ie 样式表（通过@import, <link> 或 <style>）最多可以有31个
预留10个style, 其他类库可能也会动态插入样式例如 umeditor
*/
var ieLimit = function(){
    var msie = parseInt((/msie (\d+)/.exec(navigator.userAgent.toLowerCase()) || [])[1], 10);
    if (isNaN(msie)) {
        msie = parseInt((/trident\/.*; rv:(\d+)/.exec(navigator.userAgent.toLowerCase()) || [])[1], 10);
    }
    return msie < 10 && document.styleSheets.length > 20;
}

const CSS_INJECTOR = "(function (css) {\n" +
"    if(ieLimit()){\n" +
"        mergeStyle(css);\n" +
"        return;\n" +
"    }\n" +
"\n" +
"    var headEl = document.getElementsByTagName('head')[0];\n" +
"    var styleEl = document.createElement('style');\n" +
"    headEl.appendChild(styleEl);\n" +
"\n" +
"    try {\n" +
"        styleEl.innerHTML = css;\n" +
"    } catch(e) {\n" +
"        try{\n" +
"           styleEl.innerText = css;\n" +
"        }catch(e) {\n" +
"           styleEl.styleSheet.cssText = css;\n" +
"        }\n" +
"    }\n" +
"})";

const REQUREJS_INJECT = "define([], function() {\n" +
"    var cssContent = {{ cssContent }};\n" +
"    var injectCssFn = {{ injectCssFn }};\n" +
"\n" +
"    return {\n" +
"        inject: function() {\n" +
"            injectCssFn(cssContent);\n" +
"        }\n" +
"    };\n" +
"});";

const REQUREJS_RUNNER = "define([], function() {\n" +
"    var cssContent = {{ cssContent }};\n" +
"    var injectCssFn = {{ injectCssFn }};\n" +
"\n" +
"    injectCssFn(cssContent);\n" +
"\n" +
"    return {};\n" +
"});";

const VANILLA_RUNNER = "(function() {\n" +
"    var cssContent = {{ cssContent }};\n" +
"    var mergeStyle = {{ mergeStyle }};\n" +
"    var ieLimit = {{ ieLimit }};\n" +
"    var injectCssFn = {{ injectCssFn }};\n" +
"\n" +
"    injectCssFn(cssContent);\n" +
"})();";

module.exports.defaultOptions = {
  templates: {
    css_injector: CSS_INJECTOR,
    requirejs_inject: REQUREJS_INJECT,
    requirejs_runner: REQUREJS_RUNNER,
    vanilla_runner: VANILLA_RUNNER
  },
  template: 'vanilla_runner'
}