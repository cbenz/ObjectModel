import { BasicModel, initModel, autocast, checkDefinition, checkAssertions } from "./basic-model"
import { is, setConstructorProto, toString } from "./helpers"

const ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"]

function ArrayModel(def){

	const model = function(array = model.default) {
		model.validate(array)
		return new Proxy(array, {
			get(arr, key) {
				if (key === "constructor")
					return model
				else if (ARRAY_MUTATOR_METHODS.includes(key))
					return proxifyArrayMethod(arr, key, model)
				return arr[key]
			},
			set(arr, key, val) {
				setArrayKey(arr, key, val, model)
				return true
			},
			getPrototypeOf(){
				return model.prototype
			}
		})
	}

	setConstructorProto(model, Array.prototype)
	initModel(model, arguments, ArrayModel)
	return model
}

setConstructorProto(ArrayModel, BasicModel.prototype)
Object.assign(ArrayModel.prototype, {

	toString(stack){
		return 'Array of ' + toString(this.definition, stack)
	},

	_validate(arr, path, errorStack, callStack){
		if(is(Array, arr))
			arr.forEach((a,i) => {
				arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errorStack, callStack, true)
			})
		else errorStack.push({
			expected: this,
			received: arr,
			path
		})

		checkAssertions(arr, this, path, errorStack)
	}
})

function proxifyArrayMethod(array, method, model){
	return function() {
		const testArray = array.slice()
		Array.prototype[method].apply(testArray, arguments)
		model.validate(testArray)
		const returnValue = Array.prototype[method].apply(array, arguments)
		array.forEach((a,i)=> array[i] = autocast(a, model.definition))
		return returnValue
	}
}

function setArrayKey(array, key, value, model){
	let path = `Array[${key}]`;
	if(parseInt(key) === +key && key >= 0)
		value = checkDefinition(value, model.definition, path, model.errorStack, [], true)

	const testArray = array.slice()
	testArray[key] = value
	checkAssertions(testArray, model, path)
	model.unstackErrors()
	array[key] = value
}

export default ArrayModel