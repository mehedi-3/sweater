// =======================================
// Sample Request Client Script
// Copyright (c) 2025, Mehedi Abdullah
// =======================================
// This script handles:
// - Auto-filling requested_by, request_date
// - Populating workstation details
// - Auto-creating Item & Yarn Items on save
// - Style filtering for style_name link field
// =======================================

frappe.ui.form.on('Sample Request', {
    onload(frm) {
        set_requested_by(frm);
        set_request_date(frm);
        set_style_filter(frm);
        setup_workstation_details(frm);
    },

    refresh(frm) {
        frm.set_value("request_date", frappe.datetime.now_datetime());

        frm.add_custom_button(__('Create Items'), () => frm.trigger('create_items'));
        frm.add_custom_button(__('Create Yarn Items'), () => frm.trigger('create_yarn_items'));
    },

    before_save(frm) {
        if (!frm.doc.item_category || !frm.doc.customer || !frm.doc.style) {
            frappe.msgprint("Please fill in the required fields: Item Category, Customer, and Style.");
            frappe.validated = false;
            return;
        }

        const item_code = `${frm.doc.item_category} - ${frm.doc.customer} - ${frm.doc.style}`.toUpperCase();
        const item_name = item_code;

        create_if_not_exists(item_code, item_name, {
            is_sweater: 1,
            item_group: frm.doc.item_category,
            description: `Item for Customer: ${frm.doc.customer}`,
        }, "Sweater item created successfully!");

        // Handle Yarn Items
        (frm.doc.material_requirement || []).forEach(row => {
            if (row.category?.toLowerCase() === "yarn" && row.yarn_composition && row.yarn_count) {
                const yarn_code = `YARN - ${frm.doc.customer} - ${frm.doc.style} - ${row.yarn_composition} - ${row.yarn_count}`.toUpperCase();

                create_if_not_exists(yarn_code, yarn_code, {
                    item_group: "Yarn",
                    description: `Yarn Composition: ${row.yarn_composition}, Yarn Count: ${row.yarn_count}`
                }, "Yarn item created successfully!");
            }
        });
    }
});

// Utility: Set Requested By if not already filled
function set_requested_by(frm) {
    if (!frm.doc.requested_by) {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Employee",
                filters: { user_id: frappe.session.user },
                fields: ["name", "employee_name"],
                limit_page_length: 1
            },
            callback({ message }) {
                if (message?.length) {
                    const emp = message[0];
                    frm.set_value("requested_by", emp.name);
                    frm.set_df_property("requested_by", "description", emp.employee_name);
                } else {
                    frappe.msgprint("No Employee record found for this user.");
                }
            }
        });
    }
}

// Utility: Set Request Date
function set_request_date(frm) {
    if (!frm.doc.request_date) {
        frm.set_value("request_date", frappe.datetime.now_datetime());
    }
}

// Utility: Style Name filter based on SWEATER group
function set_style_filter(frm) {
    frm.set_query("style_name", () => ({
        filters: { item_group: "SWEATER" }
    }));
}

// Utility: Setup default workstation processes
function setup_workstation_details(frm) {
    const process_names = [
        "Design", "Knitting", "Knitting Manual", "Linking", "Mending",
        "Wash", "Print", "Iron", "Sewing", "Zip / Button", "Print", "Finishing"
    ];
    const process_types = ["Chart", "Swatch", "Panel", "Body"];

    frappe.meta.get_docfield("Workstation Details", "process_name", frm.doc.name).options = process_names.join("\n");
    frappe.meta.get_docfield("Workstation Details", "process_type", frm.doc.name).options = process_types.join("\n");

    if (!frm.doc.workstation_details?.length) {
        process_names.forEach(name => {
            let row = frm.add_child("workstation_details");
            row.process_name = name;
            row.process_type = process_types[Math.floor(Math.random() * process_types.length)];
        });
        frm.refresh_field("workstation_details");
    }
}

// Utility: Create Item if not exists
function create_if_not_exists(item_code, item_name, fields, success_message) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Item",
            filters: { item_code },
            fields: ["name"]
        },
        callback({ message }) {
            if (!message.length) {
                frappe.call({
                    method: "frappe.client.insert",
                    args: {
                        doc: Object.assign({
                            doctype: "Item",
                            item_code,
                            item_name,
                            stock_uom: "Nos",
                            is_stock_item: 1,
                            item_category: fields.item_category || "Sweater"
                        }, fields)
                    },
                    callback(r) {
                        if (r.message) {
                            frappe.msgprint(success_message);
                        }
                    }
                });
            }
        }
    });
}
