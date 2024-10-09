module.exports = {
    host: "0.0.0.0",
    port: 3000,
    logpath: "logger.php",
    foodMass: 1,
    fireFood: 20,
    limitSplit: 16,
    defaultPlayerMass: 10,
	virus: {
        fill: "#33ff33",
        stroke: "#19D119",
        strokeWidth: 20,
        defaultMass: {
            from: 100,
            to: 150
        },
        splitMass: 50,
        uniformDisposition: true,
	},
    gameWidth: 8000,
    gameHeight: 8000,
    adminPass: "DEFAULT",
    gameMass: 20000,
    maxFood: 1500,
    maxVirus: 50,
    slowBase: 4.5,
    logChat: 0,
    networkUpdateFactor: 60,
    maxHeartbeatInterval: 5000,
    foodUniformDisposition: true,
    newPlayerInitialPosition: "farthest",
    massLossRate: 10,
    minMassLoss: 50,
    sqlinfo: {
      fileName: "db.sqlite3",
    }
};
