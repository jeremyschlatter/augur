(window.webpackJsonp=window.webpackJsonp||[]).push([[37],{529:function(e,t,r){"use strict";r.d(t,"a",(function(){return i})),r.d(t,"b",(function(){return m}));var a=r(0),n=r.n(a);function c(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function b(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,a)}return r}function o(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?b(Object(r),!0).forEach((function(t){c(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):b(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function l(e,t){if(null==e)return{};var r,a,n=function(e,t){if(null==e)return{};var r,a,n={},c=Object.keys(e);for(a=0;a<c.length;a++)r=c[a],t.indexOf(r)>=0||(n[r]=e[r]);return n}(e,t);if(Object.getOwnPropertySymbols){var c=Object.getOwnPropertySymbols(e);for(a=0;a<c.length;a++)r=c[a],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(n[r]=e[r])}return n}var s=n.a.createContext({}),p=function(e){var t=n.a.useContext(s),r=t;return e&&(r="function"==typeof e?e(t):o(o({},t),e)),r},i=function(e){var t=p(e.components);return n.a.createElement(s.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return n.a.createElement(n.a.Fragment,{},t)}},u=n.a.forwardRef((function(e,t){var r=e.components,a=e.mdxType,c=e.originalType,b=e.parentName,s=l(e,["components","mdxType","originalType","parentName"]),i=p(r),u=a,m=i["".concat(b,".").concat(u)]||i[u]||d[u]||c;return r?n.a.createElement(m,o(o({ref:t},s),{},{components:r})):n.a.createElement(m,o({ref:t},s))}));function m(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var c=r.length,b=new Array(c);b[0]=u;var o={};for(var l in t)hasOwnProperty.call(t,l)&&(o[l]=t[l]);o.originalType=e,o.mdxType="string"==typeof e?e:a,b[1]=o;for(var s=2;s<c;s++)b[s]=r[s];return n.a.createElement.apply(null,b)}return n.a.createElement.apply(null,r)}u.displayName="MDXCreateElement"},87:function(e,t,r){"use strict";r.r(t),r.d(t,"frontMatter",(function(){return b})),r.d(t,"metadata",(function(){return o})),r.d(t,"rightToc",(function(){return l})),r.d(t,"default",(function(){return p}));var a=r(2),n=r(6),c=(r(0),r(529)),b={},o={unversionedId:"api/sdk/interfaces/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface",id:"api/sdk/interfaces/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface",isDocsHomePage:!1,title:"_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface",description:'@augurproject/types \u203a Globals \u203a "augur-sdk/src/state/sync/BlockAndLogStreamerSyncStrategy" \u203a BlockAndLogStreamerInterface',source:"@site/../docs/api/sdk/interfaces/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface.md",permalink:"/docs/api/sdk/interfaces/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface",editUrl:"https://github.com/AugurProject/augur/edit/documentation/augur.sh/../docs/api/sdk/interfaces/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface.md"},l=[{value:"Type parameters",id:"type-parameters",children:[]},{value:"Hierarchy",id:"hierarchy",children:[]},{value:"Index",id:"index",children:[{value:"Properties",id:"properties",children:[]}]},{value:"Properties",id:"properties-1",children:[{value:"reconcileNewBlock",id:"reconcilenewblock",children:[]},{value:"subscribeToOnBlockAdded",id:"subscribetoonblockadded",children:[]},{value:"subscribeToOnBlockRemoved",id:"subscribetoonblockremoved",children:[]}]}],s={rightToc:l};function p(e){var t=e.components,r=Object(n.a)(e,["components"]);return Object(c.b)("wrapper",Object(a.a)({},s,r,{components:t,mdxType:"MDXLayout"}),Object(c.b)("p",null,Object(c.b)("a",Object(a.a)({parentName:"p"},{href:"/docs/api/sdk/README"}),"@augurproject/types")," \u203a ",Object(c.b)("a",Object(a.a)({parentName:"p"},{href:"/docs/api/sdk/globals"}),"Globals")," \u203a ",Object(c.b)("a",Object(a.a)({parentName:"p"},{href:"/docs/api/sdk/modules/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_"}),'"augur-sdk/src/state/sync/BlockAndLogStreamerSyncStrategy"')," \u203a ",Object(c.b)("a",Object(a.a)({parentName:"p"},{href:"/docs/api/sdk/interfaces/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface"}),"BlockAndLogStreamerInterface")),Object(c.b)("h1",{id:"interface-blockandlogstreamerinterface-tblock-tlog"},"Interface: BlockAndLogStreamerInterface \u2039",Object(c.b)("strong",{parentName:"h1"},"TBlock, TLog"),"\u203a"),Object(c.b)("h2",{id:"type-parameters"},"Type parameters"),Object(c.b)("p",null,"\u25aa ",Object(c.b)("strong",{parentName:"p"},"TBlock"),": ",Object(c.b)("em",{parentName:"p"},"Block")),Object(c.b)("p",null,"\u25aa ",Object(c.b)("strong",{parentName:"p"},"TLog"),": ",Object(c.b)("em",{parentName:"p"},"BlockStreamLog")),Object(c.b)("h2",{id:"hierarchy"},"Hierarchy"),Object(c.b)("ul",null,Object(c.b)("li",{parentName:"ul"},Object(c.b)("strong",{parentName:"li"},"BlockAndLogStreamerInterface"))),Object(c.b)("h2",{id:"index"},"Index"),Object(c.b)("h3",{id:"properties"},"Properties"),Object(c.b)("ul",null,Object(c.b)("li",{parentName:"ul"},Object(c.b)("a",Object(a.a)({parentName:"li"},{href:"/docs/api/sdk/interfaces/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface#reconcilenewblock"}),"reconcileNewBlock")),Object(c.b)("li",{parentName:"ul"},Object(c.b)("a",Object(a.a)({parentName:"li"},{href:"/docs/api/sdk/interfaces/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface#subscribetoonblockadded"}),"subscribeToOnBlockAdded")),Object(c.b)("li",{parentName:"ul"},Object(c.b)("a",Object(a.a)({parentName:"li"},{href:"/docs/api/sdk/interfaces/_augur_sdk_src_state_sync_blockandlogstreamersyncstrategy_.blockandlogstreamerinterface#subscribetoonblockremoved"}),"subscribeToOnBlockRemoved"))),Object(c.b)("h2",{id:"properties-1"},"Properties"),Object(c.b)("h3",{id:"reconcilenewblock"},"reconcileNewBlock"),Object(c.b)("p",null,"\u2022 ",Object(c.b)("strong",{parentName:"p"},"reconcileNewBlock"),": ",Object(c.b)("em",{parentName:"p"},"function")),Object(c.b)("p",null,Object(c.b)("em",{parentName:"p"},"Defined in ",Object(c.b)("a",Object(a.a)({parentName:"em"},{href:"https://github.com/AugurProject/augur/blob/88b6e76efb/packages/augur-sdk/src/state/sync/BlockAndLogStreamerSyncStrategy.ts#L36"}),"packages/augur-sdk/src/state/sync/BlockAndLogStreamerSyncStrategy.ts:36"))),Object(c.b)("h4",{id:"type-declaration"},"Type declaration:"),Object(c.b)("p",null,"\u25b8 (",Object(c.b)("inlineCode",{parentName:"p"},"block"),": TBlock): ",Object(c.b)("em",{parentName:"p"},"Promise\u2039void\u203a")),Object(c.b)("p",null,Object(c.b)("strong",{parentName:"p"},"Parameters:")),Object(c.b)("table",null,Object(c.b)("thead",{parentName:"table"},Object(c.b)("tr",{parentName:"thead"},Object(c.b)("th",Object(a.a)({parentName:"tr"},{align:null}),"Name"),Object(c.b)("th",Object(a.a)({parentName:"tr"},{align:null}),"Type"))),Object(c.b)("tbody",{parentName:"table"},Object(c.b)("tr",{parentName:"tbody"},Object(c.b)("td",Object(a.a)({parentName:"tr"},{align:null}),Object(c.b)("inlineCode",{parentName:"td"},"block")),Object(c.b)("td",Object(a.a)({parentName:"tr"},{align:null}),"TBlock")))),Object(c.b)("hr",null),Object(c.b)("h3",{id:"subscribetoonblockadded"},"subscribeToOnBlockAdded"),Object(c.b)("p",null,"\u2022 ",Object(c.b)("strong",{parentName:"p"},"subscribeToOnBlockAdded"),": ",Object(c.b)("em",{parentName:"p"},"function")),Object(c.b)("p",null,Object(c.b)("em",{parentName:"p"},"Defined in ",Object(c.b)("a",Object(a.a)({parentName:"em"},{href:"https://github.com/AugurProject/augur/blob/88b6e76efb/packages/augur-sdk/src/state/sync/BlockAndLogStreamerSyncStrategy.ts#L37"}),"packages/augur-sdk/src/state/sync/BlockAndLogStreamerSyncStrategy.ts:37"))),Object(c.b)("h4",{id:"type-declaration-1"},"Type declaration:"),Object(c.b)("p",null,"\u25b8 (",Object(c.b)("inlineCode",{parentName:"p"},"onBlockAdded"),": function): ",Object(c.b)("em",{parentName:"p"},"string")),Object(c.b)("p",null,Object(c.b)("strong",{parentName:"p"},"Parameters:")),Object(c.b)("p",null,"\u25aa ",Object(c.b)("strong",{parentName:"p"},"onBlockAdded"),": ",Object(c.b)("em",{parentName:"p"},"function")),Object(c.b)("p",null,"\u25b8 (",Object(c.b)("inlineCode",{parentName:"p"},"block"),": TBlock): ",Object(c.b)("em",{parentName:"p"},"void")),Object(c.b)("p",null,Object(c.b)("strong",{parentName:"p"},"Parameters:")),Object(c.b)("table",null,Object(c.b)("thead",{parentName:"table"},Object(c.b)("tr",{parentName:"thead"},Object(c.b)("th",Object(a.a)({parentName:"tr"},{align:null}),"Name"),Object(c.b)("th",Object(a.a)({parentName:"tr"},{align:null}),"Type"))),Object(c.b)("tbody",{parentName:"table"},Object(c.b)("tr",{parentName:"tbody"},Object(c.b)("td",Object(a.a)({parentName:"tr"},{align:null}),Object(c.b)("inlineCode",{parentName:"td"},"block")),Object(c.b)("td",Object(a.a)({parentName:"tr"},{align:null}),"TBlock")))),Object(c.b)("hr",null),Object(c.b)("h3",{id:"subscribetoonblockremoved"},"subscribeToOnBlockRemoved"),Object(c.b)("p",null,"\u2022 ",Object(c.b)("strong",{parentName:"p"},"subscribeToOnBlockRemoved"),": ",Object(c.b)("em",{parentName:"p"},"function")),Object(c.b)("p",null,Object(c.b)("em",{parentName:"p"},"Defined in ",Object(c.b)("a",Object(a.a)({parentName:"em"},{href:"https://github.com/AugurProject/augur/blob/88b6e76efb/packages/augur-sdk/src/state/sync/BlockAndLogStreamerSyncStrategy.ts#L38"}),"packages/augur-sdk/src/state/sync/BlockAndLogStreamerSyncStrategy.ts:38"))),Object(c.b)("h4",{id:"type-declaration-2"},"Type declaration:"),Object(c.b)("p",null,"\u25b8 (",Object(c.b)("inlineCode",{parentName:"p"},"onBlockRemoved"),": function): ",Object(c.b)("em",{parentName:"p"},"string")),Object(c.b)("p",null,Object(c.b)("strong",{parentName:"p"},"Parameters:")),Object(c.b)("p",null,"\u25aa ",Object(c.b)("strong",{parentName:"p"},"onBlockRemoved"),": ",Object(c.b)("em",{parentName:"p"},"function")),Object(c.b)("p",null,"\u25b8 (",Object(c.b)("inlineCode",{parentName:"p"},"block"),": TBlock): ",Object(c.b)("em",{parentName:"p"},"void")),Object(c.b)("p",null,Object(c.b)("strong",{parentName:"p"},"Parameters:")),Object(c.b)("table",null,Object(c.b)("thead",{parentName:"table"},Object(c.b)("tr",{parentName:"thead"},Object(c.b)("th",Object(a.a)({parentName:"tr"},{align:null}),"Name"),Object(c.b)("th",Object(a.a)({parentName:"tr"},{align:null}),"Type"))),Object(c.b)("tbody",{parentName:"table"},Object(c.b)("tr",{parentName:"tbody"},Object(c.b)("td",Object(a.a)({parentName:"tr"},{align:null}),Object(c.b)("inlineCode",{parentName:"td"},"block")),Object(c.b)("td",Object(a.a)({parentName:"tr"},{align:null}),"TBlock")))))}p.isMDXComponent=!0}}]);