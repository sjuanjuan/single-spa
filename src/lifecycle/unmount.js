import {MOUNTED,NOT_MOUNTED,UNMOUNTING} from '../application/app.helper'

export async function toUnmountPromise(app){
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
        resolve("成功")
    },1000)
})