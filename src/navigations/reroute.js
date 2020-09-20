import { started } from '../start'
import { getAppChanges } from '../application/app';
import { toLoadPromise } from '../lifecycle/load.js'
import { toUnmountPromise } from '../lifecycle/unmount';
import { toBootstrapPromise } from '../lifecycle/bootstrap';
import { toMountPromise } from '../lifecycle/mount';
import './navigator-events'

//核心处理方法
export function reroute(){
    //需要获取要加载的应用
    //需要获取要被挂载的应用
    //需要获取被卸载的应用

    const { appsToLoad,appsToMount,appsToUnmount } = getAppChanges()
    if(started){
        return performAppChange();  //app装载
    }else{
        return loadApps();  //注册应用时，需要预先加载
    }

    async function performAppChange(){  //根据路径来装载应用
        //先卸载不需要的应用
       let toUnmountPromises=appsToUnmount.map(toUnmountPromise)
       //去加载需要的应用
       appsToLoad.map(async (app)=>{
           app = await toLoadPromise(app);
           app = await toBootstrapPromise(app);
           return await toMountPromise(app);
       })
       appsToMount.map(async (app)=>{
           app=await toBootstrapPromise(app);
           return toMountPromise(app);
       })
    }

    async function loadApps(){  //预加载应用
        let apps=await Promise.all(appsToLoad.map(toLoadPromise));  //就是获取到bootstrap,mount和unmount方法放到app上
    }
}

// 这个流程是用于初始化操作的，我们还需要当路径切换时重新加载应用