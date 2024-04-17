import { effect } from './effect';

export const computed = (getter: Function) => {
    let _value = effect(getter) // 这里的getter就是计算属性的getter

     class ComputedRefImpl{ // 计算属性的实现
        get value(){ // 计算属性的值
            return _value() //通过执行getter来获取计算属性的值
        }
    }

    return new ComputedRefImpl()
}