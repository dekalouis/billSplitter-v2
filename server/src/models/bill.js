import { ObjectId } from "mongodb";
import { getDb } from "../config/mongodb.js";

export default class Bill {
  static getCollection() {
    const db = getDb();
    return db.collection("bills");
  }

  static getParticipantsCollection() {
    const db = getDb();
    return db.collection("participants");
  }

  static getItemsCollection() {
    const db = getDb();
    return db.collection("items");
  }

  static getItemAllocationsCollection() {
    const db = getDb();
    return db.collection("itemAllocations");
  }

  // Bill CRUD operations
  static async create(billData, userId) {
    const collection = this.getCollection();

    const newBill = {
      ...billData,
      userId: new ObjectId(userId),
      totalAmount:
        billData.subtotal + billData.taxAmount + billData.serviceChargeAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newBill);
    return await this.findById(result.insertedId);
  }

  static async findById(id) {
    const collection = this.getCollection();
    const bill = await collection.findOne({ _id: new ObjectId(id) });

    if (!bill) return null;

    // Populate participants and items
    bill.participants = await this.getParticipantsByBillId(id);
    bill.items = await this.getItemsByBillId(id);

    return bill;
  }

  static async findByUserId(userId) {
    const collection = this.getCollection();
    const bills = await collection
      .find({ userId: new ObjectId(userId) })
      .toArray();

    // Populate each bill with participants and items
    for (const bill of bills) {
      bill.participants = await this.getParticipantsByBillId(bill._id);
      bill.items = await this.getItemsByBillId(bill._id);
    }

    return bills;
  }

  static async update(id, updateData, userId) {
    const collection = this.getCollection();

    const updateFields = {
      ...updateData,
      updatedAt: new Date(),
    };

    // Recalculate total if financial fields are updated
    if (
      updateData.subtotal ||
      updateData.taxAmount ||
      updateData.serviceChargeAmount
    ) {
      const existingBill = await collection.findOne({
        _id: new ObjectId(id),
        userId: new ObjectId(userId),
      });
      if (!existingBill) throw new Error("Bill not found");

      const subtotal = updateData.subtotal ?? existingBill.subtotal;
      const taxAmount = updateData.taxAmount ?? existingBill.taxAmount;
      const serviceChargeAmount =
        updateData.serviceChargeAmount ?? existingBill.serviceChargeAmount;

      updateFields.totalAmount = subtotal + taxAmount + serviceChargeAmount;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      throw new Error("Bill not found or unauthorized");
    }

    return await this.findById(id);
  }

  static async delete(id, userId) {
    const collection = this.getCollection();

    // Delete related data first
    await this.deleteAllBillRelatedData(id);

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    });

    return result.deletedCount > 0;
  }

  static async processOCRData(billId, ocrData, items, userId) {
    const collection = this.getCollection();
    const itemsCollection = this.getItemsCollection();

    // Verify bill ownership
    const bill = await collection.findOne({
      _id: new ObjectId(billId),
      userId: new ObjectId(userId),
    });

    if (!bill) throw new Error("Bill not found or unauthorized");

    // Update bill with OCR data
    await collection.updateOne(
      { _id: new ObjectId(billId) },
      {
        $set: {
          ocrData,
          updatedAt: new Date(),
        },
      }
    );

    // Add items from OCR
    const itemsToInsert = items.map((item) => ({
      ...item,
      billId: new ObjectId(billId),
      createdAt: new Date(),
    }));

    if (itemsToInsert.length > 0) {
      await itemsCollection.insertMany(itemsToInsert);
    }

    return await this.findById(billId);
  }

  // Participant operations
  static async addParticipant(participantData) {
    const collection = this.getParticipantsCollection();

    const newParticipant = {
      ...participantData,
      billId: new ObjectId(participantData.billId),
      totalOwed: 0,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newParticipant);
    return await this.getParticipantById(result.insertedId);
  }

  static async getParticipantsByBillId(billId) {
    const collection = this.getParticipantsCollection();
    const participants = await collection
      .find({ billId: new ObjectId(billId) })
      .toArray();

    // Add item allocations to each participant
    for (const participant of participants) {
      participant.itemAllocations = await this.getAllocationsByParticipantId(
        participant._id
      );
    }

    return participants;
  }

  static async getParticipantById(id) {
    const collection = this.getParticipantsCollection();
    const participant = await collection.findOne({ _id: new ObjectId(id) });

    if (participant) {
      participant.itemAllocations = await this.getAllocationsByParticipantId(
        id
      );
    }

    return participant;
  }

  // Item operations
  static async addItem(itemData) {
    const collection = this.getItemsCollection();

    const newItem = {
      ...itemData,
      billId: new ObjectId(itemData.billId),
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newItem);
    return await this.getItemById(result.insertedId);
  }

  static async getItemsByBillId(billId) {
    const collection = this.getItemsCollection();
    const items = await collection
      .find({ billId: new ObjectId(billId) })
      .toArray();

    // Add allocations to each item
    for (const item of items) {
      item.allocations = await this.getAllocationsByItemId(item._id);
    }

    return items;
  }

  static async getItemById(id) {
    const collection = this.getItemsCollection();
    const item = await collection.findOne({ _id: new ObjectId(id) });

    if (item) {
      item.allocations = await this.getAllocationsByItemId(id);
    }

    return item;
  }

  // Item allocation operations
  static async createItemAllocation(allocationData) {
    const allocationsCollection = this.getItemAllocationsCollection();
    const itemsCollection = this.getItemsCollection();

    // Get the item to calculate the amount
    const item = await itemsCollection.findOne({
      _id: new ObjectId(allocationData.itemId),
    });
    if (!item) throw new Error("Item not found");

    const amount = item.price * item.quantity * allocationData.portion;

    const newAllocation = {
      ...allocationData,
      itemId: new ObjectId(allocationData.itemId),
      participantId: new ObjectId(allocationData.participantId),
      billId: item.billId,
      amount,
      createdAt: new Date(),
    };

    const result = await allocationsCollection.insertOne(newAllocation);

    // Recalculate participant's total
    await this.recalculateParticipantTotal(allocationData.participantId);

    return await this.getAllocationById(result.insertedId);
  }

  static async getAllocationById(id) {
    const collection = this.getItemAllocationsCollection();
    const allocation = await collection.findOne({ _id: new ObjectId(id) });

    if (allocation) {
      allocation.item = await this.getItemById(allocation.itemId);
      allocation.participant = await this.getParticipantById(
        allocation.participantId
      );
    }

    return allocation;
  }

  static async getAllocationsByItemId(itemId) {
    const collection = this.getItemAllocationsCollection();
    return await collection.find({ itemId: new ObjectId(itemId) }).toArray();
  }

  static async getAllocationsByParticipantId(participantId) {
    const collection = this.getItemAllocationsCollection();
    return await collection
      .find({ participantId: new ObjectId(participantId) })
      .toArray();
  }

  static async getAllocationsByBillId(billId) {
    const collection = this.getItemAllocationsCollection();
    const allocations = await collection
      .find({ billId: new ObjectId(billId) })
      .toArray();

    // Populate each allocation
    for (const allocation of allocations) {
      allocation.item = await this.getItemById(allocation.itemId);
      allocation.participant = await this.getParticipantById(
        allocation.participantId
      );
    }

    return allocations;
  }

  // Calculation methods
  static async recalculateParticipantTotal(participantId) {
    const allocationsCollection = this.getItemAllocationsCollection();
    const participantsCollection = this.getParticipantsCollection();

    const allocations = await allocationsCollection
      .find({
        participantId: new ObjectId(participantId),
      })
      .toArray();

    const totalOwed = allocations.reduce(
      (sum, allocation) => sum + allocation.amount,
      0
    );

    await participantsCollection.updateOne(
      { _id: new ObjectId(participantId) },
      { $set: { totalOwed } }
    );
  }

  static async recalculateBillTotals(billId) {
    const participants = await this.getParticipantsByBillId(billId);

    // Recalculate each participant's total
    for (const participant of participants) {
      await this.recalculateParticipantTotal(participant._id);
    }

    return await this.findById(billId);
  }

  // Cleanup operations
  static async deleteAllBillRelatedData(billId) {
    const participantsCollection = this.getParticipantsCollection();
    const itemsCollection = this.getItemsCollection();
    const allocationsCollection = this.getItemAllocationsCollection();

    await allocationsCollection.deleteMany({ billId: new ObjectId(billId) });
    await itemsCollection.deleteMany({ billId: new ObjectId(billId) });
    await participantsCollection.deleteMany({ billId: new ObjectId(billId) });
  }
}
