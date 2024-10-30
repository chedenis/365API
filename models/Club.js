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
      enum: ["50% off", "Treat like member"], // Matches the string values used in the frontend
    },
    email: {
      type: String,
      required: true, // Email is required
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); // Simple email regex validation
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
      ], // URL validation
    },
    profileImage: { type: String, required: false }, // S3 URL for profile image
    featuredImage: { type: String, required: false }, // S3 URL for featured image
    galleryImages: [{ type: String }], // Array of S3 URLs for gallery images
    phone: { type: String, required: false },
    dropInPlay: { type: Boolean, default: false },
    reservations: { type: Boolean, default: false },
    reservationLink: { type: String, required: false },
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
      enum: ["Wooden", "Asphalt/Concrete", "Glow in the Dark"],
      default: [],
    },
    netType: {
      type: [String],
      enum: ["Portable", "Bring your own", "Permanent"],
      default: [],
    },
    courtTypes: {
      type: [String],
      enum: ["Covered courts", "Outdoor courts", "Indoor courts"],
      default: [],
    },
    amenities: {
      type: [String],
      enum: [
        "Court Benches",
        "Ball Machine",
        "None",
        "Water fountain",
        "Shaded Seating",
        "Seating Area",
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
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Index clubName and status for faster queries
clubSchema.index({ clubName: 1 });
clubSchema.index({ status: 1 });

module.exports = mongoose.model("Club", clubSchema);
