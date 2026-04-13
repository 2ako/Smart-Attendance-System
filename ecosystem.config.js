module.exports = {
    apps: [
        {
            name: "smart-attendance",
            script: "node_modules/next/dist/bin/next",
            args: "start -H 0.0.0.0 -p 3000",
            env: {
                NODE_ENV: "production",
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G"
        }
    ]
};
