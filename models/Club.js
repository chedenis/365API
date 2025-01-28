const mongoose = require("mongoose");
const addressSchema = require("./Address");

const timeRangeSchema = new mongoose.Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
});

const clubSchema = new mongoose.Schema(
  {
    clubName: { type: String, required: false },
    progress: {
      type: [String],
      enum: [
        "amenities",
        "clubDetails",
        "operatingHours",
        "dropInHours",
        "memberBenefits",
        "images",
      ],
      default: [],
    },
    address: { type: addressSchema, required: false },
    mailingAddress: { type: addressSchema, required: false },
    memberPerk: {
      type: String,
      enum: ["50% off", "Treat like member"],
    },
    email: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    website: {
      type: String,
      required: false,
      match: [
        /^https?:\/\/[a-zA-Z0-9-_.]+\.[a-z]{2,}$/,
        "Please fill a valid URL",
      ],
    },
    profileImage: { type: String, required: false },
    featuredImage: { type: String, required: false },
    galleryImages: [{ type: String }],
    phone: { type: String, required: false },
    dropInPlay: { type: Boolean, default: false },
    reservations: { type: Boolean, default: false },
    reservationLink: { type: String, required: false },
    dropInLink: { type: String, required: false },
    membershipFee: { type: String, required: false },
    outdoorPlay: { type: Boolean, default: false },
    indoorPlay: { type: Boolean, default: false },
    clayCourts: { type: Boolean, default: false },
    grassCourts: { type: Boolean, default: false },
    asphaltConcreteCourts: { type: Boolean, default: false },
    numberOfCourts: { type: Number, default: 0 },
    reservationSystem: {
      type: String,
      enum: ["Court Reserve", "Picklepod", "Playbypoint", "Other", "None"],
      default: "None",
    },
    courtReserveNumber: { type: String, required: false },
    shortDescription: { type: String, required: false },
    surfaceType: {
      type: [String],
      enum: ["Wooden", "Asphalt/Concrete", "Glow in the Dark", "Clay", "Other"],
      default: [],
    },
    netType: {
      type: [String],
      enum: ["Portable", "Bring your own", "Permanent"],
      default: [],
    },
    courtTypes: {
      type: [String],
      enum: ["Outdoor", "Outdoor covered", "Indoor"],
      default: [],
    },
    amenities: {
      type: [String],
      enum: [
        "Seating area",
        "Water filling station",
        "Restroom",
        "Lockers",
        "Showers",
        "Ball machine",
        "Tournaments",
        "Clinics",
        "Lessons",
        "Open play",
        "Round robin",
        "Pro shop",
        "Demo paddles",
        "Paddles for purchase",
        "Pickleballs for purchase",
        "Clothing for purchase",
        "Fitness classes",
        "Indoor pool",
        "Outdoor pool",
        "Sauna",
        "Hot tub",
        "Tennis courts",
        "Running track",
        "Spa",
        "Gym",
        "Racquetball",
        "Padel",
        "Squash",
        "Climbing wall",
        "Restaurant",
        "Vending machine",
        "Bar",
        "Snack bar",
        "Childcare",
        "Playground equipment",
        "Indoor play area",
        "On-site parking",
        "Off-site parking",
        "Covered parking",
        "Street parking",
      ],
      default: [],
    },
    activities: {
      type: [String],
      enum: ["Tournaments", "Clinics", "Round Robin", "Lessons"],
      default: [],
    },
    proShopAmenities: {
      type: [String],
      enum: [
        "Clothing",
        "Pro Shop",
        "Rental Paddles",
        "Paddles for purchase",
        "Trial Paddles",
        "Pickleballs for purchase",
      ],
      default: [],
    },
    proshopDiscount: { type: String, default: "0%" },
    ageRestrictions: { type: Number, required: false },
    otherActivities: {
      type: [String],
      enum: [
        "Fitness classes",
        "Outdoor Pool",
        "Sauna",
        "Tennis courts",
        "Indoor Pool",
        "Running track",
        "Basketball",
        "Spa",
        "Gym",
        "Racquetball",
        "Climbing wall",
        "Squash",
      ],
      default: [],
    },
    foodBeverage: {
      type: [String],
      enum: ["Restaurant", "Bar", "Vending machines", "Snack bar", "None"],
      default: [],
    },
    hasRestrooms: { type: Boolean, default: false },
    lockerAmenities: {
      type: [String],
      enum: [
        "Sauna",
        "Changing rooms",
        "Jacuzzi",
        "Guest lockers",
        "Showers",
        "Locker Room",
        "Steam room",
        "Lockers",
        "Toilets",
      ],
      default: [],
    },
    childcareAmenities: {
      type: [String],
      enum: [
        "Jungle gym",
        "Childcare",
        "Outdoor play area",
        "Indoor play area",
      ],
      default: [],
    },
    parkingType: {
      type: [String],
      enum: [
        "No designated parking",
        "On-site",
        "Off-site",
        "Covered",
        "Street parking",
      ],
      required: false,
    },
    dropInHours: {
      Monday: [timeRangeSchema],
      Tuesday: [timeRangeSchema],
      Wednesday: [timeRangeSchema],
      Thursday: [timeRangeSchema],
      Friday: [timeRangeSchema],
      Saturday: [timeRangeSchema],
      Sunday: [timeRangeSchema],
    },
    operatingHours: {
      Monday: [timeRangeSchema],
      Tuesday: [timeRangeSchema],
      Wednesday: [timeRangeSchema],
      Thursday: [timeRangeSchema],
      Friday: [timeRangeSchema],
      Saturday: [timeRangeSchema],
      Sunday: [timeRangeSchema],
    },
    status: {
      type: String,
      enum: ["Not Ready", "Ready", "Complete"],
      default: "Not Ready",
    },
  },
  {
    timestamps: true,
  }
);

// Index clubName and status for faster queries
clubSchema.index({ clubName: 1 });
clubSchema.index({ status: 1 });

// Dynamically set the model name based on the environment
let modelName = "Club";
if (process.env.NODE_ENV === "qa") {
  modelName = "ClubQA";
} else if (process.env.NODE_ENV === "production") {
  modelName = "ClubPROD";
}

// Export the model with the dynamic name
module.exports =
  mongoose.models[modelName] || mongoose.model(modelName, clubSchema);
