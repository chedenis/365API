const mongoose = require("mongoose");
const addressSchema = require("./Address");

const clubSchema = new mongoose.Schema(
  {
    clubName: { type: String, required: false },
    address: { type: addressSchema, required: false },
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
    logo: { type: String, required: false },
    phone: { type: String, required: false },
    dropInPlay: { type: Boolean, default: false },
    reservations: { type: Boolean, default: false },
    outdoorPlay: { type: Boolean, default: false },
    indoorPlay: { type: Boolean, default: false },
    clayCourts: { type: Boolean, default: false },
    grassCourts: { type: Boolean, default: false },
    asphaltConcreteCourts: { type: Boolean, default: false },
    numberOfCourts: { type: Number, default: 0 },
    reservationType: {
      type: String,
      enum: ["Court reserve", "PicklePod", "Playbypoint", "Other", "None"],
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
    pickleballAmenities: {
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
    proShopDiscount: { type: String, default: "0%" },
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
      type: String,
      enum: [
        "No designated parking",
        "On-site",
        "Off-site",
        "Covered",
        "Street parking",
      ],
      required: false,
    },
    operatingHours: {
      monday: {
        open: { type: String, required: false },
        close: { type: String, required: false },
      },
      tuesday: {
        open: { type: String, required: false },
        close: { type: String, required: false },
      },
      wednesday: {
        open: { type: String, required: false },
        close: { type: String, required: false },
      },
      thursday: {
        open: { type: String, required: false },
        close: { type: String, required: false },
      },
      friday: {
        open: { type: String, required: false },
        close: { type: String, required: false },
      },
      saturday: {
        open: { type: String, required: false },
        close: { type: String, required: false },
      },
      sunday: {
        open: { type: String, required: false },
        close: { type: String, required: false },
      },
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
