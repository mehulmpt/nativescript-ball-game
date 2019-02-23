const Physics = require('nativescript-physics-js')
const { fromObject } = require('tns-core-modules/data/observable')
let world
let clickInProgress = false
let intv
const obj = fromObject({
	taps: 0,
	seconds: 0
})

function sigmoid(t) {
	return 1/(1 + Math.pow(Math.E, -t)) - 0.5 // -0.5 - 0.5
}

exports.onLoaded = function(args) {
	const page = args.object
	page.bindingContext = obj
	const container = page.getViewById('game')
	const meta = page.getViewById('meta')
	
	world = Physics()
	world.add(Physics.renderer('ns', {
		container: container,
		metaText: meta,
		meta: true
	}))

	const { width, height } = container.getActualSize()

	world.add([
		Physics.behavior('edge-collision-detection', { aabb: Physics.aabb(0, 0, width, height - 200) }),
		Physics.behavior('body-collision-detection'),
		Physics.behavior('body-impulse-response'),
		Physics.behavior('sweep-prune'),
		Physics.behavior('constant-acceleration')
	])
	
	addBall(100, 100)
	addFloor(width / 2, height - 200, width, 10)

	const query = Physics.query({
		$or: [
			{ bodyA: { label: 'main-ball' }, bodyB: { label: 'floor' } },
			{ bodyA: { label: 'floor' }, bodyB: { label: 'main-ball' } }
		]
	})
	
	world.on('step', () => world.render())
	world.on('collisions:detected', function(data) {
		if(Physics.util.find(data.collisions, query)) {
			world.pause()
			clearInterval(intv)
			alert('Touched down!')
		}
	})

	setInterval(() => {
		world.step(Date.now())
	}, 17)

	intv = setInterval(() => {
		obj.set('seconds', obj.get('seconds') + 1)
	}, 1000)
}

exports.onTap = function(e) {
	if(clickInProgress) return
	obj.set('taps', obj.get('taps') + 1)
	clickInProgress = true
	// get the ball

	const ball = world.findOne({
		label: 'main-ball'
	})

	const { x:ballX, y:ballY } = ball.state.pos
	const [tapX, tapY] = [e.getX(), e.getY()]

	const [x_temp, y_temp] = [1/(ballX - tapX), 1/(ballY - tapY)]

	const diffX = sigmoid(x_temp)
	const diffY = sigmoid(y_temp)

	const x = diffX/Math.sqrt(diffX**2 + diffY**2)
	const y = diffY/Math.sqrt(diffX**2 + diffY**2)



	const force = new Physics.vector(0.05*x, 0.1*y)
	ball.applyForce(force)

	// calculate the difference between click position
	// and the ball position

	// push the ball in that direction


	setTimeout(() => clickInProgress = false, 100)
}

exports.onReset = function() {
	const ball = world.findOne({
		label: 'main-ball'
	})

	ball.state.pos = new Physics.vector(100, 100)
	ball.state.vel = new Physics.vector(0, 0)
	ball.state.acc = new Physics.vector(0, 0)
	ball.state.angular.pos = 0
	ball.state.angular.vel = 0
	ball.state.angular.acc = 0
	
	obj.set('seconds', 0)
	obj.set('taps', 0)
	intv = setInterval(() => {
		obj.set('seconds', obj.get('seconds') + 1)
	}, 1000)

	world.unpause()
}

function addBall(x, y) {
	const ball = Physics.body('circle', {
		label: 'main-ball',
		x,
		y,
		radius: 20,
		styles: { image: "~/ball.png" }
	})

	ball.restitution = 0.3
	world.add(ball)
}

function addFloor(x, y, width, height) {
	const floor = Physics.body('rectangle', {
		treatment: 'static',
		label: 'floor',
		x,
		y,
		width,
		height,
		styles: { color: "yellow" }
	})

	world.add(floor)
}