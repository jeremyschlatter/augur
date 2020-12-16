(window.webpackJsonp=window.webpackJsonp||[]).push([[308],{364:function(e,t,r){"use strict";r.r(t),r.d(t,"frontMatter",(function(){return s})),r.d(t,"metadata",(function(){return i})),r.d(t,"rightToc",(function(){return u})),r.d(t,"default",(function(){return p}));var a=r(2),n=r(6),c=(r(0),r(529)),s={},i={unversionedId:"api/sdk/modules/_augur_sdk_src_api_gsn_",id:"api/sdk/modules/_augur_sdk_src_api_gsn_",isDocsHomePage:!1,title:"_augur_sdk_src_api_gsn_",description:'@augurproject/types \u203a Globals \u203a "augur-sdk/src/api/GSN"',source:"@site/../docs/api/sdk/modules/_augur_sdk_src_api_gsn_.md",permalink:"/docs/api/sdk/modules/_augur_sdk_src_api_gsn_",editUrl:"https://github.com/AugurProject/augur/edit/documentation/augur.sh/../docs/api/sdk/modules/_augur_sdk_src_api_gsn_.md"},u=[{value:"Index",id:"index",children:[{value:"Classes",id:"classes",children:[]},{value:"Variables",id:"variables",children:[]}]},{value:"Variables",id:"variables-1",children:[{value:"<code>Const</code> MIN_EXCHANGE_RATE_MULTIPLIER",id:"const-min_exchange_rate_multiplier",children:[]},{value:"<code>Const</code> WITHDRAW_GAS_COST_MAX",id:"const-withdraw_gas_cost_max",children:[]}]}],o={rightToc:u};function p(e){var t=e.components,r=Object(n.a)(e,["components"]);return Object(c.b)("wrapper",Object(a.a)({},o,r,{components:t,mdxType:"MDXLayout"}),Object(c.b)("p",null,Object(c.b)("a",Object(a.a)({parentName:"p"},{href:"/docs/api/sdk/README"}),"@augurproject/types")," \u203a ",Object(c.b)("a",Object(a.a)({parentName:"p"},{href:"/docs/api/sdk/globals"}),"Globals")," \u203a ",Object(c.b)("a",Object(a.a)({parentName:"p"},{href:"/docs/api/sdk/modules/_augur_sdk_src_api_gsn_"}),'"augur-sdk/src/api/GSN"')),Object(c.b)("h1",{id:"module-augur-sdksrcapigsn"},'Module: "augur-sdk/src/api/GSN"'),Object(c.b)("h2",{id:"index"},"Index"),Object(c.b)("h3",{id:"classes"},"Classes"),Object(c.b)("ul",null,Object(c.b)("li",{parentName:"ul"},Object(c.b)("a",Object(a.a)({parentName:"li"},{href:"/docs/api/sdk/classes/_augur_sdk_src_api_gsn_.gsn"}),"GSN"))),Object(c.b)("h3",{id:"variables"},"Variables"),Object(c.b)("ul",null,Object(c.b)("li",{parentName:"ul"},Object(c.b)("a",Object(a.a)({parentName:"li"},{href:"/docs/api/sdk/modules/_augur_sdk_src_api_gsn_#const-min_exchange_rate_multiplier"}),"MIN_EXCHANGE_RATE_MULTIPLIER")),Object(c.b)("li",{parentName:"ul"},Object(c.b)("a",Object(a.a)({parentName:"li"},{href:"/docs/api/sdk/modules/_augur_sdk_src_api_gsn_#const-withdraw_gas_cost_max"}),"WITHDRAW_GAS_COST_MAX"))),Object(c.b)("h2",{id:"variables-1"},"Variables"),Object(c.b)("h3",{id:"const-min_exchange_rate_multiplier"},Object(c.b)("inlineCode",{parentName:"h3"},"Const")," MIN_EXCHANGE_RATE_MULTIPLIER"),Object(c.b)("p",null,"\u2022 ",Object(c.b)("strong",{parentName:"p"},"MIN_EXCHANGE_RATE_MULTIPLIER"),": ",Object(c.b)("em",{parentName:"p"},"0.85")," = 0.85"),Object(c.b)("p",null,Object(c.b)("em",{parentName:"p"},"Defined in ",Object(c.b)("a",Object(a.a)({parentName:"em"},{href:"https://github.com/AugurProject/augur/blob/69c4be52bf/packages/augur-sdk/src/api/GSN.ts#L8"}),"packages/augur-sdk/src/api/GSN.ts:8"))),Object(c.b)("hr",null),Object(c.b)("h3",{id:"const-withdraw_gas_cost_max"},Object(c.b)("inlineCode",{parentName:"h3"},"Const")," WITHDRAW_GAS_COST_MAX"),Object(c.b)("p",null,"\u2022 ",Object(c.b)("strong",{parentName:"p"},"WITHDRAW_GAS_COST_MAX"),": ",Object(c.b)("em",{parentName:"p"},"BigNumber\u2039\u203a")," = new BigNumber(200000)"),Object(c.b)("p",null,Object(c.b)("em",{parentName:"p"},"Defined in ",Object(c.b)("a",Object(a.a)({parentName:"em"},{href:"https://github.com/AugurProject/augur/blob/69c4be52bf/packages/augur-sdk/src/api/GSN.ts#L9"}),"packages/augur-sdk/src/api/GSN.ts:9"))))}p.isMDXComponent=!0},529:function(e,t,r){"use strict";r.d(t,"a",(function(){return b})),r.d(t,"b",(function(){return _}));var a=r(0),n=r.n(a);function c(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function s(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,a)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?s(Object(r),!0).forEach((function(t){c(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):s(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function u(e,t){if(null==e)return{};var r,a,n=function(e,t){if(null==e)return{};var r,a,n={},c=Object.keys(e);for(a=0;a<c.length;a++)r=c[a],t.indexOf(r)>=0||(n[r]=e[r]);return n}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(a=0;a<c.length;a++)r=c[a],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(n[r]=e[r])}return n}var o=n.a.createContext({}),p=function(e){var t=n.a.useContext(o),r=t;return e&&(r="function"==typeof e?e(t):i(i({},t),e)),r},b=function(e){var t=p(e.components);return n.a.createElement(o.Provider,{value:t},e.children)},l={inlineCode:"code",wrapper:function(e){var t=e.children;return n.a.createElement(n.a.Fragment,{},t)}},d=n.a.forwardRef((function(e,t){var r=e.components,a=e.mdxType,c=e.originalType,s=e.parentName,o=u(e,["components","mdxType","originalType","parentName"]),b=p(r),d=a,_=b["".concat(s,".").concat(d)]||b[d]||l[d]||c;return r?n.a.createElement(_,i(i({ref:t},o),{},{components:r})):n.a.createElement(_,i({ref:t},o))}));function _(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var c=r.length,s=new Array(c);s[0]=d;var i={};for(var u in t)hasOwnProperty.call(t,u)&&(i[u]=t[u]);i.originalType=e,i.mdxType="string"==typeof e?e:a,s[1]=i;for(var o=2;o<c;o++)s[o]=r[o];return n.a.createElement.apply(null,s)}return n.a.createElement.apply(null,r)}d.displayName="MDXCreateElement"}}]);