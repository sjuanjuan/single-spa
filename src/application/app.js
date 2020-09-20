import { NOT_LOADED, shouldBeActive, LOADING_SOURCE_CODE, NOT_BOOTSTRAPPED, BOOTSTRAPPING, NOT_MOUNTED, MOUNTED} from './app.helper';
import { reroute } from '../navigations/reroute'
/**
 * 
 * @param {*} appName 应用的名字
 * @param {*} loadApp 加载的应用
 * @param {*} activeWhen 当激活时调用loadApp
 * @param {*} customProps 自定义属性
 */

 const apps=[]

 //维护应用所有的状态
export function registerApplication(appName,loadApp,activeWhen,customProps){
    apps.push({  // 这里就将应用注册好了
        name:appName,
        loadApp,
        activeWhen,
        customProps,
        status:NOT_LOADED
    });
    reroute();
}

export function getAppChanges(){
    const appsToUnmount=[]; //要卸载的应用
    const appsToLoad=[]; //要加载的应用
    const appsToMount=[]; //要挂载的应用
    apps.forEach(app => {
        const appShouldBeActive = shouldBeActive(app);
        switch(app.status){
            case NOT_LOADED:
            case LOADING_SOURCE_CODE:
                if(appShouldBeActive){
                    appsToLoad.push(app)
                }
               break;
            case NOT_BOOTSTRAPPED:
            case BOOTSTRAPPING:
            case NOT_MOUNTED:
                if(appShouldBeActive){
                    appsToMount.push(app)
                }
                break;
            case MOUNTED:
                if(!appShouldBeActive){
                    appsToUnmount.push(app)
                }
        }
    })
    return {appsToUnmount,appsToLoad,appsToMount}
}