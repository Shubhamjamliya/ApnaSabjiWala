import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import AppSettings from "../../../models/AppSettings";
import PaymentMethod from "../../../models/PaymentMethod";

/**
 * Get app settings
 */
export const getAppSettings = asyncHandler(
  async (_req: Request, res: Response) => {
    let settings = await AppSettings.findOne();

    // Create default settings if none exist
    if (!settings) {
      settings = await AppSettings.create({
        appName: "BarodaMart",
        contactEmail: "contact@barodamart.com",
        contactPhone: "1234567890",
      });
    }

    return res.status(200).json({
      success: true,
      message: "App settings fetched successfully",
      data: settings,
    });
  }
);

/**
 * Update app settings
 */
export const updateAppSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const updateData = req.body;
    updateData.updatedBy = req.user?.userId;

    console.log(`[DEBUG Settings] Incoming update payload:`, JSON.stringify(updateData.deliveryConfig, null, 2));

    let settings = await AppSettings.findOne();

    if (!settings) {
      settings = await AppSettings.create(updateData);
    } else {
      settings = await AppSettings.findOneAndUpdate({}, updateData, {
        new: true,
        runValidators: true,
      });
    }

    console.log(`[DEBUG Settings] Updated settings:`, JSON.stringify(settings?.deliveryConfig, null, 2));

    return res.status(200).json({
      success: true,
      message: "App settings updated successfully",
      data: settings,
    });
  }
);

const normalizePhoneNumber = (value: unknown): string =>
  typeof value === "string" ? value.trim().replace(/[\s().-]/g, "") : "";

/**
 * Update the contact actions shown in the customer FAQ "Need help" section.
 */
export const updateNeedHelpSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const input = req.body?.needHelpSettings;

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return res.status(400).json({
        success: false,
        message: "Need help settings are required",
      });
    }

    const mobileNumber = normalizePhoneNumber(input.mobileNumber);
    const whatsappNumber = normalizePhoneNumber(input.whatsappNumber);
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const phonePattern = /^\+?[1-9]\d{6,14}$/;
    const whatsappPattern = /^\+[1-9]\d{7,14}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!phonePattern.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid mobile number with 7 to 15 digits, optionally starting with +",
      });
    }

    if (!emailPattern.test(email) || email.length > 254) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    if (!whatsappPattern.test(whatsappNumber)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid WhatsApp number including + and the country code",
      });
    }

    const needHelpSettings = { mobileNumber, email, whatsappNumber };
    const settings = await AppSettings.findOneAndUpdate(
      {},
      {
        $set: {
          needHelpSettings,
          updatedBy: req.user?.userId,
        },
        $setOnInsert: {
          appName: "BarodaMart",
          contactEmail: "contact@barodamart.com",
          contactPhone: "1234567890",
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Need help settings updated successfully",
      data: settings.needHelpSettings,
    });
  }
);

/**
 * Get payment methods
 */
export const getPaymentMethods = asyncHandler(
  async (_req: Request, res: Response) => {
    const paymentMethods = await PaymentMethod.find().sort({ order: 1 });

    return res.status(200).json({
      success: true,
      message: "Payment methods fetched successfully",
      data: paymentMethods,
    });
  }
);

/**
 * Update payment methods
 */
export const updatePaymentMethods = asyncHandler(
  async (req: Request, res: Response) => {
    const { paymentMethods } = req.body; // Array of payment method objects

    if (!Array.isArray(paymentMethods)) {
      return res.status(400).json({
        success: false,
        message: "Payment methods array is required",
      });
    }

    // Update or create each payment method
    const updatePromises = paymentMethods.map((pm: any) =>
      PaymentMethod.findOneAndUpdate({ name: pm.name }, pm, {
        upsert: true,
        new: true,
        runValidators: true,
      })
    );

    await Promise.all(updatePromises);

    const updatedMethods = await PaymentMethod.find().sort({ order: 1 });

    return res.status(200).json({
      success: true,
      message: "Payment methods updated successfully",
      data: updatedMethods,
    });
  }
);

/**
 * Get SMS gateway settings
 */
export const getSMSGatewaySettings = asyncHandler(
  async (_req: Request, res: Response) => {
    const settings = await AppSettings.findOne().select("smsGateway");

    return res.status(200).json({
      success: true,
      message: "SMS gateway settings fetched successfully",
      data: settings?.smsGateway || null,
    });
  }
);

/**
 * Update SMS gateway settings
 */
export const updateSMSGatewaySettings = asyncHandler(
  async (req: Request, res: Response) => {
    const { smsGateway } = req.body;

    let settings = await AppSettings.findOne();

    if (!settings) {
      settings = await AppSettings.create({
        appName: "BarodaMart",
        contactEmail: "contact@barodamart.com",
        contactPhone: "1234567890",
        smsGateway,
      });
    } else {
      settings.smsGateway = smsGateway;
      settings.updatedBy = req.user?.userId as any;
      await settings.save();
    }

    return res.status(200).json({
      success: true,
      message: "SMS gateway settings updated successfully",
      data: settings.smsGateway,
    });
  }
);
