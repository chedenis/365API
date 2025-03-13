const { Club, ClubAuth } = require("../models");

exports.updateReferralCodeInClub = async (req, res) => {
  try {
    const clubAuthsWithReferrals = await ClubAuth.find({
      referralCode: { $exists: true, $ne: "" },
    });
    let updateCount = 0;
    let errorCount = 0;

    for (const clubAuth of clubAuthsWithReferrals) {
      try {
        // Find associated clubs for this clubAuth
        if (!clubAuth.clubs || clubAuth.clubs.length === 0) {
          console.log(`ClubAuth ${clubAuth._id} has no associated clubs`);
          continue;
        }

        await Club.updateMany({}, { $set: { referralCode: "" } });

        // Update each club with the referralCode
        for (const clubId of clubAuth.clubs) {
          // Check if club exists
          const club = await Club.findById(clubId);

          if (!club) {
            console.log(`Club with ID ${clubId} not found`);
            continue;
          }

          // Update club with referralCode
          const updateResult = await Club.findByIdAndUpdate(clubId, {
            $set: { referralCode: clubAuth.referralCode || "" },
          });

          if (updateResult) {
            updateCount++;
            console.log(
              `Updated Club: ${updateResult.clubName} with referral code: ${clubAuth.referralCode}`
            );
          }
        }
      } catch (err) {
        errorCount++;
        console.error(
          `Error processing ClubAuth ${clubAuth._id}:`,
          err.message
        );
      }
    }

    console.log(`Update complete:`);
    console.log(`- Total updates: ${updateCount}`);
    console.log(`- Errors: ${errorCount}`);

    return res.status(200).json({
      message: "Success",
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
