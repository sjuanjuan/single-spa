(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.singleSpa = {}));
}(this, (function (exports) { 'use strict';

    //描述应用的整个状态

    const NOT_LOADED = 'NOT_LOADED'; //应用初始状态
    const LOADING_SOURCE_CODE = 'LOADING_SOURCE_CODE'; //加载资源
    const NOT_BOOTSTRAPPED = 'NOT_BOOTSTRAPPED';  //还没有调用bootstrap方法
    const BOOTSTRAPPING = 'BOOTSTRAPPING'; //启动中
    const NOT_MOUNTED = 'NOT_MOUNTED'; //没有调用mount方法
    const MOUNTING = 'MOUNTTING'; //正在挂载中
    const MOUNTED = 'MOUNTED'; //挂载完毕
    const UNMOUNTING = 'UNMOUNTING'; //解除挂载
    //当前应用是否需要被激活
    function shouldBeActive(app){
        return app.activeWhen(window.location)
    }

    let started=false;    //除了去加载应用还需要去挂载应用，
    function start(){
        started=true;
        reroute();
    }

    function flattenFnArray(fns){
        fns=Array.isArray(fns)?fns:[fns];
        return (props)=>fns.reduce((p,fn)=>p.then(()=>fn(props)),Promise.resolve());
    }

    async function toLoadPromise(app){
        if(app.loadPromise){
            return app.loadPromise
        }
        return (app.loadPromise=Promise.resolve().then(async ()=>{
            app.status=LOADING_SOURCE_CODE;
            let {bootstrap,mount,unmount}=await app.loadApp(app.custormProps);
            app.status=NOT_BOOTSTRAPPED; //没有调用bootstrap方法
        
            app.bootstrap=flattenFnArray(bootstrap);
            app.mount=flattenFnArray(mount);
            app.unmount=flattenFnArray(unmount);
            delete app.loadPromise;
            return app;
        }))

        //疑问点：加载app时为什么要执行app.mount和app.unmount  
    }

    async function toUnmountPromise(app){
        if(app.status!=MOUNTED){
            return app;
        }
        app.status=UNMOUNTING;
        //疑问点：app.mount方法是什么，哪里传过来的？
        await app.unmount(app.customProps);
        app.status=NOT_MOUNTED;
        return app
    }


    var p=new Promise(function(resolve,reject){
        setTimeout(function(){
            resolve("成功");
        },1000);
    });

    async function toBootstrapPromise(app){
        if(app.status!==NOT_BOOTSTRAPPED){
            return app;
        }
        app.status=BOOTSTRAPPING;
        await app.bootstrap(app.customProps);
        app.status=NOT_MOUNTED;
        return app
    }

    async function toMountPromise(app){
        if(app.status!==NOT_MOUNTED){
            return app;
        }
        app.status=MOUNTING;
        await app.mount(app.customProps);
        app.status=MOUNTED;
        return app;
    }

    const routingEventsListeningTo=['hashchange','popstate'];

    function urlRoute(){
        reroute();  //会根据路径重新加载不同的应用
    }
    const capturedEventListeners={  //后续挂载的事件先暂存起来
        hashchange:[],
        popstate:[]
    };

    window.addEventListener('hashchange',urlRoute);
    window.addEventListener('popstate',urlRoute);

    const originalAddEventListener=window.addEventListener;
    const originalRemoveEventListener=window.removeEventListener;

    //存起来了什么时候调用
    window.addEventListener=function(eventName,fn){
        if(routingEventsListeningTo.indexOf(eventName)>=0 && !capturedEventListeners[eventName].some(listener=>{})){
            capturedEventListeners[eventName].push(fn);
            console.log(capturedEventListeners);
            return;
        }
        //如果不是hashchange和popstate事件，还是触发原本该有的的事件
        return originalAddEventListener.apply(this,arguments);
    };
    window.removeEventListener=function(eventName,fn){
        if(routingEventsListeningTo.indexOf(eventName)>=0){
            capturedEventListeners[eventName]=capturedEventListeners[eventName].filter(l => l!=fn);
            return;
        }
        return originalRemoveEventListener.apply(this,arguments);
    };

    // 如果是hash路由，hash变化时可以切换
    // 浏览器路由，浏览器路由是h5 api的，如果切换时不会触发popstate
    function patchedUpdateStatua(updatestate,methodName){
        return function(){
            const urlBefore=window.location.href;
            updatestate.apply(this,arguments);
            const urlAfter=window.location.href;
            if(urlBefore!=urlAfter){
                urlRoute(new PopStateEvent('popstate'));
            }
        }
    }

     window.history.pushState=patchedUpdateStatua(window.history.pushState);
     window.history.replaceState=patchedUpdateStatua(window.history.replaceState);

    //核心处理方法
    function reroute(){
        //需要获取要加载的应用
        //需要获取要被挂载的应用
        //需要获取被卸载的应用

        const { appsToLoad,appsToMount,appsToUnmount } = getAppChanges();
        if(started){
            return performAppChange();  //app装载
        }else {
            return loadApps();  //注册应用时，需要预先加载
        }

        async function performAppChange(){  //根据路径来装载应用
            //先卸载不需要的应用
           let toUnmountPromises=appsToUnmount.map(toUnmountPromise);
           //去加载需要的应用
           appsToLoad.map(async (app)=>{
               app = await toLoadPromise(app);
               app = await toBootstrapPromise(app);
               return await toMountPromise(app);
           });
           appsToMount.map(async (app)=>{
               app=await toBootstrapPromise(app);
               return toMountPromise(app);
           });
        }

        async function loadApps(){  //预加载应用
            let apps=await Promise.all(appsToLoad.map(toLoadPromise));  //就是获取到bootstrap,mount和unmount方法放到app上
        }
    }

    // 这个流程是用于初始化操作的，我们还需要当路径切换时重新加载应用

    /**
     * 
     * @param {*} appName 应用的名字
     * @param {*} loadApp 加载的应用
     * @param {*} activeWhen 当激活时调用loadApp
     * @param {*} customProps 自定义属性
     */

     const apps=[];

     //维护应用所有的状态
    function registerApplication(appName,loadApp,activeWhen,customProps){
        apps.push({  // 这里就将应用注册好了
            name:appName,
            loadApp,
            activeWhen,
            customProps,
            status:NOT_LOADED
        });
        reroute();
    }

    function getAppChanges(){
        const appsToUnmount=[]; //要卸载的应用
        const appsToLoad=[]; //要加载的应用
        const appsToMount=[]; //要挂载的应用
        apps.forEach(app => {
            const appShouldBeActive = shouldBeActive(app);
            switch(app.status){
                case NOT_LOADED:
                case LOADING_SOURCE_CODE:
                    if(appShouldBeActive){
                        appsToLoad.push(app);
                    }
                   break;
                case NOT_BOOTSTRAPPED:
                case BOOTSTRAPPING:
                case NOT_MOUNTED:
                    if(appShouldBeActive){
                        appsToMount.push(app);
                    }
                    break;
                case MOUNTED:
                    if(!appShouldBeActive){
                        appsToUnmount.push(app);
                    }
            }
        });
        return {appsToUnmount,appsToLoad,appsToMount}
    }

    exports.registerApplication = registerApplication;
    exports.start = start;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=single-spa.js.map
