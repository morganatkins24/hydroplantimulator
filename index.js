const mains_frequency = 50;
let mains_angle = 0;
const mains_phase = 0;

const wicket_step = 0.01;
const wicket_speed = 0.05; // fraction per second, e.g. 0.1 will move 10% per 1s
const rotor_mass = 500; // kg

let previous_tick_time = null;

let generator_frequency = 0;
let generator_angle = 0;
let generator_phase = 0;

let wicket_gate_setpoint = 0; // 0 to 1
let wicket_gate_current = 0; // 0 to 1
let wicket_gate_target = 0.35;
let generator_speed = 0; // 0 to 1
let power_output = 0;

let contactor = 0;

let wicketGateGaugeElement;
let frequencyCoarseGaugeElement;
let frequencyFineGaugeElement;
let phaseGaugeElement;
let powerGaugeElement;

let locked_out = false;

function update_ui() {
    wicketGateGaugeElement.setAttribute('data-value', wicket_gate_current * 100);
    frequencyCoarseGaugeElement.setAttribute('data-value', generator_frequency);
    frequencyFineGaugeElement.setAttribute('data-value', generator_frequency);
    phaseGaugeElement.setAttribute('data-value', 0 - (generator_phase + 180));
    powerGaugeElement.setAttribute('data-value', power_output);
}

function fail() {
    locked_out = true;
    wicket_gate_setpoint = 0;
    $("#locked_out").show();
}

function close_contactor() {
    if (Math.abs(generator_frequency - 50) > 1) {
        fail();
    } else {
        if (!(generator_phase < 5 || generator_phase > 355)) {
            fail();
        } else {
            contactor = 1;
        }
    }
}

function tick_sync(delta_t) {

    // Model inertia of the generator

    // Let's simulate some physics...
    // Let's assume force of water is directly proporiational to the wicket opening
    let force = wicket_gate_current * 10; // magic number?
    // Subtract friction, proportional to current speed plus a fixed value
    force = force - ((generator_speed * 15) + 0.5); // magic number
    // F = ma
    let angular_acceleration = force / rotor_mass;

    generator_speed = generator_speed + (angular_acceleration * delta_t);
    //generator_speed = generator_speed + ((d / 20));

    // Speed of wicket_gate_target should equate to 50 Hz
    generator_frequency = (generator_speed / wicket_gate_target) * 50;

    if (generator_frequency > 70) {
        fail();
    }

    // Phase differences
    mains_angle = (mains_angle + (360 * delta_t / (1 / 50))) % 360;
    generator_angle = (generator_angle + (360 * delta_t / (1 / generator_frequency))) % 360;

    generator_phase = Math.round(mains_angle - generator_angle);
    if (generator_phase < 0) {
        generator_phase = generator_phase + 360;
    }
    if (generator_phase > 360) {
        generator_phase = generator_phase - 360;
    }

}

function tick_run() {
    generator_frequency = 50;
    generator_phase = 0;

    console.log("Current:" + wicket_gate_current);
    console.log("Target:" + wicket_gate_target);
    let p_d = ((wicket_gate_current - wicket_gate_target) * 80) - power_output;
    power_output = power_output + (p_d / 5);

    if (power_output < 0) {
        fail();
    }
}

function tick_wicket(delta_t) {
    let delta = Math.abs(wicket_gate_setpoint - wicket_gate_current)
    let direction = (wicket_gate_setpoint - wicket_gate_current) > 0 ? 1 : -1;
    wicket_gate_current = wicket_gate_current + (direction * Math.min(wicket_speed * delta_t, delta));
}

function tick() {
    // time
    let new_tick_time = new Date().getTime();
    let delta_t = (new_tick_time - previous_tick_time) / 1000;
    tick_wicket(delta_t)
    if (contactor === 0) {
        tick_sync(delta_t);
    } else {
        tick_run();
    }
    update_ui();
    previous_tick_time = new_tick_time;
}

setInterval(tick, 100);

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function gateOpen() {
    wicket_gate_setpoint = wicket_gate_setpoint + wicket_step;
    if (wicket_gate_setpoint > 1) {
        wicket_gate_setpoint = 1;
    }
}

function gateClose() {
    wicket_gate_setpoint = wicket_gate_setpoint - wicket_step;
    if (wicket_gate_setpoint < 0) {
        wicket_gate_setpoint = 0;
    }
}

$(document).ready(function () {
    previous_tick_time = new Date().getTime();

    // Generate a slightly randomised wicket gate target
    wicket_gate_target = randomIntFromInterval(25, 35) / 100;


    $("#gate_open").click(gateOpen);
    $("#gate_close").click(gateClose);
    $(document).keydown(function (e) {
        // q
        if (e.which == 81) {
            if (!locked_out) {
                $("#gate_close").click();
            }
        }
        // w
        if (e.which == 87) {
            if (!locked_out) {
                $("#gate_open").click();
            }
        }
        if (e.which == 32) {
            if (!locked_out) {
                $("#close_contactor").click();
            }
        }
    });

    $("#close_contactor").click(close_contactor);
    wicketGateGaugeElement = document.getElementsByTagName('canvas')[0];
    frequencyCoarseGaugeElement = document.getElementsByTagName('canvas')[1];
    frequencyFineGaugeElement = document.getElementsByTagName('canvas')[2];
    phaseGaugeElement = document.getElementsByTagName('canvas')[3];
    powerGaugeElement = document.getElementsByTagName('canvas')[4];

    // Cheat for debugging
    // wicket_gate_current = wicket_gate_target;
    // wicket_gate_setpoint= wicket_gate_target;
    // generator_speed = (generator_frequency / 50) * wicket_gate_target
    // contactor = 1;
});
