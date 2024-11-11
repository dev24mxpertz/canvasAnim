// Ensure canvas element is retrieved correctly
var c = document.getElementById("c");
var gl = c.getContext("webgl", { preserveDrawingBuffer: true });

// Set canvas dimensions
var w = (c.width = window.innerWidth),
  h = (c.height = window.innerHeight),
  webgl = {};

// Vertex shader source code
webgl.vertexShaderSource = `
    attribute vec3 a_position;
    uniform int u_mode;
    uniform float u_trick;
    uniform vec2 u_resolution;
    varying vec3 v_data;

    void main() {
        vec2 pos = a_position.x * vec2(cos(a_position.y), sin(a_position.y));
        gl_Position = u_mode == 1
            ? vec4(vec2(1, -1) * (pos / u_resolution) * 0.8, 0, 1)
            : vec4(vec2(1, -1) * (a_position.xy / u_resolution) * 2.0, 0, 1);
        v_data = vec3(0, a_position.z + u_trick, u_mode);
        if (u_mode == 1)
            v_data.x = a_position.y;
    }
`;

// Fragment shader source code
webgl.fragmentShaderSource = `
    precision mediump float;
    varying vec3 v_data;

    vec3 h2rgb(float h) {
        return clamp(abs(mod(h * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    }

    void main() {
        vec4 color = vec4(0, 0, 0, mod(v_data.y, 1.0));
        if (v_data.z == 1.0)
            color.rgb = h2rgb(v_data.x / 6.283185307 + floor(v_data.y) / 1000.0);
        gl_FragColor = color;
    }
`;

// Create, compile and link shaders
function compileShader(gl, source, type) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation failed: ", gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

webgl.vertexShader = compileShader(
  gl,
  webgl.vertexShaderSource,
  gl.VERTEX_SHADER
);
webgl.fragmentShader = compileShader(
  gl,
  webgl.fragmentShaderSource,
  gl.FRAGMENT_SHADER
);

webgl.shaderProgram = gl.createProgram();
gl.attachShader(webgl.shaderProgram, webgl.vertexShader);
gl.attachShader(webgl.shaderProgram, webgl.fragmentShader);
gl.linkProgram(webgl.shaderProgram);
gl.useProgram(webgl.shaderProgram);

// Setup attributes and uniforms
webgl.attribLocs = {
  position: gl.getAttribLocation(webgl.shaderProgram, "a_position"),
};

webgl.buffers = {
  position: gl.createBuffer(),
};

webgl.uniformLocs = {
  tick: gl.getUniformLocation(webgl.shaderProgram, "u_tick"),
  mode: gl.getUniformLocation(webgl.shaderProgram, "u_mode"),
  resolution: gl.getUniformLocation(webgl.shaderProgram, "u_resolution"),
};

// Set up WebGL
gl.enableVertexAttribArray(webgl.attribLocs.position);
gl.bindBuffer(gl.ARRAY_BUFFER, webgl.buffers.position);
gl.vertexAttribPointer(webgl.attribLocs.position, 3, gl.FLOAT, false, 0, 0);

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

gl.viewport(0, 0, w, h);
gl.uniform2f(webgl.uniformLocs.resolution, w, h);

// Animation logic
webgl.data = {
  position: [],
};

webgl.draw = function (glType) {
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(webgl.data.position),
    gl.STATIC_DRAW
  );
  gl.drawArrays(glType, 0, webgl.data.position.length / 3);
};

webgl.clear = function (z) {
  var a = w / 2,
    A = -a,
    b = h / 2,
    B = -b;
  webgl.data.position = [A, B, z, a, B, z, A, b, z, A, b, z, a, b, z, a, B, z];

  gl.uniform1i(webgl.uniformLocs.mode, 0);
  webgl.draw(gl.TRIANGLES);
  gl.uniform1i(webgl.uniformLocs.mode, 1);
  webgl.data.position.length = 0;
};

// Particle logic
var particles = [],
  tick = 0,
  opts = { baseW: 0.005, addedW: 0.015 };

function Particle(radius, radian) {
  this.radius = radius;
  this.radian = radian + 6.2831853071;
  this.w = opts.baseW + opts.addedW * Math.random();
}

Particle.prototype.step = function () {
  if (Math.random() < 0.1) {
    this.w += (Math.random() - 0.5) / 100000;
  }

  var pr = this.radian;
  this.radian += this.w;

  webgl.data.position.push(
    this.radian,
    pr,
    0.99,
    this.radius,
    this.radian,
    0.99,
    0,
    this.radian,
    0.01,
    this.radius,
    this.radian,
    0.04
  );
};

function anim() {
  window.requestAnimationFrame(anim);
  webgl.clear(0.1);
  if (particles.length < 1000) {
    for (var i = 0; i < 4; i++) {
      particles.push(
        new Particle(
          Math.random() * Math.min(w, h),
          Math.random() * 6.283185307179
        )
      );
    }
  }

  particles.forEach(function (particle) {
    particle.step();
  });

  tick++;
  gl.uniform1f(webgl.uniformLocs.tick, tick);

  webgl.draw(gl.LINES);
  webgl.data.position.length = 0;
}

anim();

window.addEventListener("resize", function () {
  w = c.width = window.innerWidth;
  h = c.height = window.innerHeight;
  gl.viewport(0, 0, w, h);
  gl.uniform2f(webgl.uniformLocs.resolution, w, h);
});

function spawnParticle(e) {
  var dx = e.clientX - w / 2,
    dy = e.clientY - h / 2;
  particles.push(
    new Particle(Math.sqrt(dx * dx + dy * dy), Math.atan2(dy, dx))
  );
}

var md = false;
window.addEventListener("mousedown", function (e) {
  md = true;
  spawnParticle(e);
});
window.addEventListener("mousemove", function (e) {
  if (md) spawnParticle(e);
});
window.addEventListener("mouseup", function () {
  md = false;
});

window.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  particles.length = 0;
});
