const State = require("../models/State");
const Country = require("../models/Country");

// Get a list of all countries
const getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find();
    if (!countries || countries.length === 0) {
      return res.status(404).json({ message: "No countries found" });
    }
    const sortedCountries = countries.sort((a, b) => {
      if (a.name === "United States") return -1;
      if (b.name === "United States") return 1;
      return a.name.localeCompare(b.name);
    });
    return res.status(200).json(sortedCountries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get states by country code
const getStatesByCountryCode = async (req, res) => {
  try {
    console.log(req.params, "req.params");
    const countryCode = req?.params?.countryCode;

    const states = await State.find({ country_code: countryCode });

    if (!states || states?.length === 0) {
      return res
        .status(404)
        .json({ message: "No states found for this country code" });
    }

    const usStatesAndDC = [
      "Alabama",
      "Alaska",
      "Arizona",
      "Arkansas",
      "California",
      "Colorado",
      "Connecticut",
      "Delaware",
      "Florida",
      "Georgia",
      "Hawaii",
      "Idaho",
      "Illinois",
      "Indiana",
      "Iowa",
      "Kansas",
      "Kentucky",
      "Louisiana",
      "Maine",
      "Maryland",
      "Massachusetts",
      "Michigan",
      "Minnesota",
      "Mississippi",
      "Missouri",
      "Montana",
      "Nebraska",
      "Nevada",
      "New Hampshire",
      "New Jersey",
      "New Mexico",
      "New York",
      "North Carolina",
      "North Dakota",
      "Ohio",
      "Oklahoma",
      "Oregon",
      "Pennsylvania",
      "Rhode Island",
      "South Carolina",
      "South Dakota",
      "Tennessee",
      "Texas",
      "Utah",
      "Vermont",
      "Virginia",
      "Washington DC",
      "West Virginia",
      "Wisconsin",
      "Wyoming",
    ];

    const filteredStates = states.filter((state) =>
      usStatesAndDC.includes(state.name)
    );

    return res.status(200).json(filteredStates);

  } catch (error) {
    console.error("Error fetching states:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllCountries,
  getStatesByCountryCode,
};
