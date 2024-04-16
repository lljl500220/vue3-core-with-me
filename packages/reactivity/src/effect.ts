let activeEffect: () => void;
export const effect = (fn: Function) => {
    const _effect = function (){
        activeEffect = _effect
        fn();
    }

    _effect()
}

const targetsMap = new WeakMap()
export const track = (target:object,key:string | symbol) =>{
    let depsMap = targetsMap.get(target)
    if (!depsMap) {
        depsMap = new Map()
        targetsMap.set(target,depsMap)
    }
    let deps = depsMap.get(key)
    if (!deps) {
        deps = new Set()
        depsMap.set(key,deps)
    }

    deps.add(activeEffect)
}

export const trigger = (target:object,key:string | symbol) =>{
    const depsMap = targetsMap.get(target)
    const deps = depsMap.get(key)

    deps.forEach((fns:Function) => {
        fns()
    })
}