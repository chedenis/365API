// models/Club.js
const mongoose = require("mongoose");
const addressSchema = require("./Address");

const clubSchema = new mongoose.Schema({
  clubName: { type: String, required: true },
  address: addressSchema,
  email: { type: String, required: true },
  website: { type: String },
  phone: { type: String },
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
  shortDescription: { type: String },
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
  ageRestrictions: { type: Number },
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
    enum: ["Jungle gym", "Childcare", "Outdoor play area", "Indoor play area"],
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
  },
  operatingHours: {
    monday: { open: { type: String }, close: { type: String } },
    tuesday: { open: { type: String }, close: { type: String } },
    wednesday: { open: { type: String }, close: { type: String } },
    thursday: { open: { type: String }, close: { type: String } },
    friday: { open: { type: String }, close: { type: String } },
    saturday: { open: { type: String }, close: { type: String } },
    sunday: { open: { type: String }, close: { type: String } },
  },
});

module.exports = mongoose.model("Club", clubSchema);