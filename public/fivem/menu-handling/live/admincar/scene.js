// Escena de la demo web del menú de handling: abre el panel en modo prueba (web/demo.js) con
// unos coches de ejemplo. Los valores imitan el handling de fábrica del juego en sus unidades
// internas (dirección en radianes, repartos ×2, velocidad en m/s), como los lee el script.
(function () {
    const rad = d => +(d * Math.PI / 180).toFixed(4);
    const BASE = {
        fInitialDriveForce: 0.32, fInitialDriveMaxFlatVel: 44.4, fDriveInertia: 1.0, fClutchChangeRateScaleUpShift: 2.6,
        fClutchChangeRateScaleDownShift: 2.6, fDriveBiasFront: 0.0, fBrakeForce: 1.0, fBrakeBiasFront: 0.9, fHandBrakeForce: 0.7,
        fSteeringLock: rad(35), fTractionCurveMax: 2.45, fTractionCurveMin: 2.2, fTractionCurveLateral: 22.5, fTractionSpringDeltaMax: 0.15,
        fLowSpeedTractionLossMult: 1.2, fCamberStiffnesss: 0.0, fTractionBiasFront: 0.97, fTractionLossMult: 1.0,
        fSuspensionForce: 2.6, fSuspensionCompDamp: 1.4, fSuspensionReboundDamp: 2.2, fSuspensionUpperLimit: 0.08, fSuspensionLowerLimit: -0.11,
        fSuspensionRaise: 0.0, fSuspensionBiasFront: 1.0, fAntiRollBarForce: 0.7, fAntiRollBarBiasFront: 1.2,
        fRollCentreHeightFront: 0.25, fRollCentreHeightRear: 0.25, fMass: 1500, fInitialDragCoeff: 0.0007, fPercentSubmerged: 85,
        vecCentreOfMassOffset: { x: 0, y: 0, z: 0 }, vecInertiaMultiplier: { x: 1, y: 1.3, z: 1.5 },
        fCollisionDamageMult: 1.0, fWeaponDamageMult: 1.0, fDeformationDamageMult: 0.8, fEngineDamageMult: 1.5,
        fPetrolTankVolume: 65, fOilVolume: 5,
    };
    const car = (spawn, label, make, cls, speedBase, b) => ({ spawn, model: spawn, label, make, hash: 0, class: cls, speedBase, base: Object.assign({}, BASE, b) });
    const VEHS = [
        car('adder', 'Adder', 'Truffade', 7, 198, { fMass: 1800, fInitialDriveForce: 0.324, fInitialDriveMaxFlatVel: 44.4, fDriveBiasFront: 0.4, fTractionCurveMax: 2.4, fTractionCurveMin: 2.15, fBrakeForce: 1.0, fDeformationDamageMult: 0.7 }),
        car('zentorno', 'Zentorno', 'Pegassi', 7, 196, { fMass: 1500, fInitialDriveForce: 0.33, fInitialDriveMaxFlatVel: 43.9, fDriveBiasFront: 0.3, fTractionCurveMax: 2.55, fTractionCurveMin: 2.3, fBrakeForce: 1.1, fSuspensionRaise: -0.01 }),
        car('t20', 'T20', 'Progen', 7, 197, { fMass: 1400, fInitialDriveForce: 0.345, fInitialDriveMaxFlatVel: 44.1, fDriveBiasFront: 0.2, fTractionCurveMax: 2.5, fTractionCurveMin: 2.26, fBrakeForce: 1.05 }),
        car('sultan', 'Sultan', 'Karin', 6, 172, { fMass: 1400, fInitialDriveForce: 0.28, fInitialDriveMaxFlatVel: 41.7, fDriveBiasFront: 0.5, fTractionCurveMax: 2.35, fTractionCurveMin: 2.1, fSuspensionForce: 2.2, fAntiRollBarForce: 0.9 }),
        car('elegy2', 'Elegy RH8', 'Annis', 6, 184, { fMass: 1400, fInitialDriveForce: 0.3, fInitialDriveMaxFlatVel: 42.8, fDriveBiasFront: 0.0, fTractionCurveMax: 2.42, fTractionCurveMin: 2.18 }),
        car('kuruma', 'Kuruma', 'Karin', 6, 174, { fMass: 1600, fInitialDriveForce: 0.27, fInitialDriveMaxFlatVel: 41.9, fDriveBiasFront: 0.5, fTractionCurveMax: 2.3, fTractionCurveMin: 2.05 }),
        car('banshee', 'Banshee', 'Bravado', 6, 182, { fMass: 1350, fInitialDriveForce: 0.31, fInitialDriveMaxFlatVel: 42.5, fTractionCurveMax: 2.3, fTractionCurveMin: 2.0, fLowSpeedTractionLossMult: 1.5 }),
        car('comet2', 'Comet', 'Pfister', 6, 180, { fMass: 1400, fInitialDriveForce: 0.3, fInitialDriveMaxFlatVel: 42.2, fTractionCurveMax: 2.38, fTractionCurveMin: 2.12 }),
    ];

    // Textos de la prueba del juego, contados para la web
    Object.assign(DEMO_API, {
        release: () => ({ ok: false, error: 'En la web no se conduce. En el juego sueltas el ratón y pruebas el coche con el panel abierto.' }),
        test: () => ({ ok: false, error: 'En la web no se saca ningún coche: en el juego aparece delante de ti para probarlo.' }),
        savePreset: () => ({ ok: false, error: 'En la demo no se guardan plantillas propias' }),
    });
    const realSave = DEMO_API.save;
    DEMO_API.save = d => {
        const r = realSave(d);
        if (r.ok) r.data.message = 'Guardado (demo). En el servidor se aplicaría al momento a todos los coches de este modelo.';
        return r;
    };

    // Botón para volver a abrir el panel si se cierra (✕ o ESC)
    const reopen = document.createElement('button');
    reopen.className = 'sc-reopen hidden';
    reopen.innerHTML = '<i class="fa-solid fa-screwdriver-wrench"></i><span>Abrir /admincar</span>';
    document.body.appendChild(reopen);
    reopen.onclick = open;

    function open() {
        reopen.classList.add('hidden');
        window.postMessage({
            action: 'open', demo: true, demoVehs: JSON.parse(JSON.stringify(VEHS)),
            groups: HANDLING.groups, fields: HANDLING.fields, presets: [], focusKey: 'PAGEUP', compareKey: 'PAGEDOWN',
        }, location.origin);
    }

    window.addEventListener('message', e => {
        const d = e.data || {};
        if (d.action === 'close') setTimeout(() => reopen.classList.remove('hidden'), 350);
        // «reiniciar» de la página: todo de fábrica otra vez
        if (d.demo === 'reset') {
            window.postMessage({ action: 'close' }, location.origin);
            setTimeout(open, 400);
        }
    });

    open();
})();
