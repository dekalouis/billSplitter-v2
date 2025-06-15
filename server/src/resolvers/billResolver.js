import Bill from "../models/bill.js";
import { authenticate, getTokenFromHeaders } from "../middleware/auth.js";

export const billResolvers = {
  Query: {
    getBillsByUser: async (_, __, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);
      return await Bill.findByUserId(user._id);
    },

    getBillById: async (_, { id }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      const bill = await Bill.findById(id);
      if (!bill) throw new Error("Bill not found");

      // Check if user owns this bill
      if (bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access to bill");
      }

      return bill;
    },

    getParticipantsByBill: async (_, { billId }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify user owns the bill
      const bill = await Bill.findById(billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access to bill");
      }

      return await Bill.getParticipantsByBillId(billId);
    },

    getItemsByBill: async (_, { billId }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify user owns the bill
      const bill = await Bill.findById(billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access to bill");
      }

      return await Bill.getItemsByBillId(billId);
    },

    getAllocationsByBill: async (_, { billId }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify user owns the bill
      const bill = await Bill.findById(billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access to bill");
      }

      return await Bill.getAllocationsByBillId(billId);
    },

    getAllocationsByParticipant: async (_, { participantId }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Get participant to verify bill ownership
      const participant = await Bill.getParticipantById(participantId);
      if (!participant) throw new Error("Participant not found");

      const bill = await Bill.findById(participant.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      return await Bill.getAllocationsByParticipantId(participantId);
    },
  },

  Mutation: {
    createBill: async (_, { input }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      return await Bill.create(input, user._id);
    },

    updateBill: async (_, { id, input }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      return await Bill.update(id, input, user._id);
    },

    deleteBill: async (_, { id }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      return await Bill.delete(id, user._id);
    },

    processOCRData: async (_, { input }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      const { billId, ocrData, items } = input;
      return await Bill.processOCRData(billId, ocrData, items, user._id);
    },

    addParticipant: async (_, { input }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify user owns the bill
      const bill = await Bill.findById(input.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access to bill");
      }

      return await Bill.addParticipant(input);
    },

    updateParticipant: async (_, { id, name, email }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify ownership through participant -> bill relationship
      const participant = await Bill.getParticipantById(id);
      if (!participant) throw new Error("Participant not found");

      const bill = await Bill.findById(participant.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      const participantsCollection = Bill.getParticipantsCollection();
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;

      await participantsCollection.updateOne(
        { _id: participant._id },
        { $set: updateData }
      );

      return await Bill.getParticipantById(id);
    },

    removeParticipant: async (_, { id }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify ownership
      const participant = await Bill.getParticipantById(id);
      if (!participant) throw new Error("Participant not found");

      const bill = await Bill.findById(participant.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      // Remove all allocations for this participant first
      const allocationsCollection = Bill.getItemAllocationsCollection();
      await allocationsCollection.deleteMany({
        participantId: participant._id,
      });

      // Remove participant
      const participantsCollection = Bill.getParticipantsCollection();
      const result = await participantsCollection.deleteOne({
        _id: participant._id,
      });

      return result.deletedCount > 0;
    },

    addItem: async (_, { input }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify user owns the bill
      const bill = await Bill.findById(input.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access to bill");
      }

      return await Bill.addItem(input);
    },

    updateItem: async (_, { id, name, price, quantity }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify ownership through item -> bill relationship
      const item = await Bill.getItemById(id);
      if (!item) throw new Error("Item not found");

      const bill = await Bill.findById(item.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      const itemsCollection = Bill.getItemsCollection();
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (price !== undefined) updateData.price = price;
      if (quantity !== undefined) updateData.quantity = quantity;

      await itemsCollection.updateOne({ _id: item._id }, { $set: updateData });

      // If price or quantity changed, recalculate all allocations for this item
      if (price !== undefined || quantity !== undefined) {
        const updatedItem = await Bill.getItemById(id);
        const allocations = await Bill.getAllocationsByItemId(id);

        const allocationsCollection = Bill.getItemAllocationsCollection();
        for (const allocation of allocations) {
          const newAmount =
            updatedItem.price * updatedItem.quantity * allocation.portion;
          await allocationsCollection.updateOne(
            { _id: allocation._id },
            { $set: { amount: newAmount } }
          );

          // Recalculate participant total
          await Bill.recalculateParticipantTotal(allocation.participantId);
        }
      }

      return await Bill.getItemById(id);
    },

    removeItem: async (_, { id }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify ownership
      const item = await Bill.getItemById(id);
      if (!item) throw new Error("Item not found");

      const bill = await Bill.findById(item.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      // Remove all allocations for this item first
      const allocationsCollection = Bill.getItemAllocationsCollection();
      const allocations = await allocationsCollection
        .find({ itemId: item._id })
        .toArray();

      await allocationsCollection.deleteMany({ itemId: item._id });

      // Recalculate participant totals
      const participantIds = [
        ...new Set(allocations.map((a) => a.participantId)),
      ];
      for (const participantId of participantIds) {
        await Bill.recalculateParticipantTotal(participantId);
      }

      // Remove item
      const itemsCollection = Bill.getItemsCollection();
      const result = await itemsCollection.deleteOne({ _id: item._id });

      return result.deletedCount > 0;
    },

    createItemAllocation: async (_, { input }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify ownership through item -> bill relationship
      const item = await Bill.getItemById(input.itemId);
      if (!item) throw new Error("Item not found");

      const bill = await Bill.findById(item.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      // Verify participant belongs to the same bill
      const participant = await Bill.getParticipantById(input.participantId);
      if (
        !participant ||
        participant.billId.toString() !== item.billId.toString()
      ) {
        throw new Error("Participant not found in this bill");
      }

      return await Bill.createItemAllocation(input);
    },

    updateItemAllocation: async (_, { input }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      const { allocationId, portion } = input;

      // Verify ownership
      const allocation = await Bill.getAllocationById(allocationId);
      if (!allocation) throw new Error("Allocation not found");

      const bill = await Bill.findById(allocation.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      // Calculate new amount
      const item = await Bill.getItemById(allocation.itemId);
      const newAmount = item.price * item.quantity * portion;

      const allocationsCollection = Bill.getItemAllocationsCollection();
      await allocationsCollection.updateOne(
        { _id: allocation._id },
        { $set: { portion, amount: newAmount } }
      );

      // Recalculate participant total
      await Bill.recalculateParticipantTotal(allocation.participantId);

      return await Bill.getAllocationById(allocationId);
    },

    removeItemAllocation: async (_, { id }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify ownership
      const allocation = await Bill.getAllocationById(id);
      if (!allocation) throw new Error("Allocation not found");

      const bill = await Bill.findById(allocation.billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access");
      }

      const allocationsCollection = Bill.getItemAllocationsCollection();
      const result = await allocationsCollection.deleteOne({
        _id: allocation._id,
      });

      if (result.deletedCount > 0) {
        // Recalculate participant total
        await Bill.recalculateParticipantTotal(allocation.participantId);
      }

      return result.deletedCount > 0;
    },

    updateMultipleAllocations: async (_, { allocations }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      const results = [];

      for (const allocationInput of allocations) {
        // Verify ownership for each allocation
        const allocation = await Bill.getAllocationById(
          allocationInput.allocationId
        );
        if (!allocation)
          throw new Error(
            `Allocation ${allocationInput.allocationId} not found`
          );

        const bill = await Bill.findById(allocation.billId);
        if (!bill || bill.userId.toString() !== user._id.toString()) {
          throw new Error("Unauthorized access");
        }

        // Calculate new amount
        const item = await Bill.getItemById(allocation.itemId);
        const newAmount = item.price * item.quantity * allocationInput.portion;

        const allocationsCollection = Bill.getItemAllocationsCollection();
        await allocationsCollection.updateOne(
          { _id: allocation._id },
          { $set: { portion: allocationInput.portion, amount: newAmount } }
        );

        // Recalculate participant total
        await Bill.recalculateParticipantTotal(allocation.participantId);

        const updatedAllocation = await Bill.getAllocationById(
          allocationInput.allocationId
        );
        results.push(updatedAllocation);
      }

      return results;
    },

    calculateBillTotals: async (_, { billId }, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);

      // Verify user owns the bill
      const bill = await Bill.findById(billId);
      if (!bill || bill.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized access to bill");
      }

      return await Bill.recalculateBillTotals(billId);
    },
  },
};
