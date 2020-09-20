import { reroute } from "./reroute";

export const routingEventsListeningTo=['hashchange','popstate'];

function urlRoute(){
    reroute([],arguments);  //会根据路径重新加载不同的应用
}
const capturedEventListeners={  //后续挂载的事件先暂存起来
    hashchange:[],
    popstate:[]
}

window.addEventListener('hashchange',urlRoute);
window.addEventListener('popstate',urlRoute);

const originalAddEventListener=window.addEventListener;
const originalRemoveEventListener=window.removeEventListener;

//存起来了什么时候调用
window.addEventListener=function(eventName,fn){
    if(routingEventsListeningTo.indexOf(eventName)>=0 && !capturedEventListeners[eventName].some(listener=>{listener==fn})){
        capturedEventListeners[eventName].push(fn);
        console.log(capturedEventListeners)
        return;
    }
    //如果不是hashchange和popstate事件，还是触发原本该有的的事件
    return originalAddEventListener.apply(this,arguments);
}
window.removeEventListener=function(eventName,fn){
    if(routingEventsListeningTo.indexOf(eventName)>=0){
        capturedEventListeners[eventName]=capturedEventListeners[eventName].filter(l => l!=fn);
        return;
    }
    return originalRemoveEventListener.apply(this,arguments);
}

// 如果是hash路由，hash变化时可以切换
// 浏览器路由，浏览器路由是h5 api的，如果切换时不会触发popstate
function patchedUpdateStatua(updatestate,methodName){
    return function(){
        const urlBefore=window.location.href;
        updatestate.apply(this,arguments);
        const urlAfter=window.location.href;
        if(urlBefore!=urlAfter){
            urlRoute(new PopStateEvent('popstate'))
        }
    }
}

 window.history.pushState=patchedUpdateStatua(window.history.pushState,'popState');
 window.history.replaceState=patchedUpdateStatua(window.history.replaceState,'replaceState');