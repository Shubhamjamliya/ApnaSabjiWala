const mongoose = require("mongoose");
const HeaderCategory = require("./src/models/HeaderCategory").default;
mongoose.connect("mongodb://127.0.0.1:27017/ApnaSabjiWala-").then(async () => {
    let home = await HeaderCategory.findOne({ slug: "all" });
    if (!home) {
        home = new HeaderCategory({
            name: "HOME",
            slug: "all",
            status: "Published",
            order: -1
        });
        await home.save();
        console.log("Created HOME category");
    } else {
        home.name = "HOME";
        await home.save();
        console.log("HOME category exists");
    }
    process.exit(0);
});
