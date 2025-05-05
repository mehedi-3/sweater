// Copyright (c) 2025, Mehedi Abdullah and contributors
// For license information, please see license.txt

frappe.ui.form.on('Sample Request', {
    onload: function(frm) {
        set_requested_by(frm);
        set_request_date(frm);
        set_style_filter(frm);

        // Set dropdown options for process_name and process_type
        frappe.meta.get_docfield("Workstation Details", "process_name", frm.doc.name).options =
            "Design\nKnitting\nKnitting Manual\nLinking\nMending\nWash\nPrint\nIron\nSewing\nZip / Button\nPrint\nFinishing";

        frappe.meta.get_docfield("Workstation Details", "process_type", frm.doc.name).options =
            "Chart\nSwatch\nPanel\nBody";

                // Autofill workstation_details child table if it's empty
        const default_process_names = [
            "Design", "Knitting", "Knitting Manual", "Linking", "Mending",
            "Wash", "Print", "Iron", "Sewing", "Zip / Button", "Print", "Finishing"
        ];
        const process_types = ["Chart", "Swatch", "Panel", "Body"];  // Possible values

        if (!frm.doc.workstation_details || frm.doc.workstation_details.length === 0) {
            default_process_names.forEach(process_name => {
                let child = frm.add_child("workstation_details");

                child.process_name = process_name;

                // Random process_type
                child.process_type = process_types[Math.floor(Math.random() * process_types.length)];
            });
            frm.refresh_field("workstation_details");
        }

    },

    refresh: function(frm) {
        // Don't override 'requested_by' with the email
        frm.set_value("request_date", frappe.datetime.now_datetime());
    
        frm.add_custom_button(__('Create Items'), function () {
            frm.trigger('create_items');
        });
    
        frm.add_custom_button(__('Create Yarn Items'), function () {
            frm.trigger('create_yarn_items');
        });
    },

    before_save: function(frm) {
        
        if (!frm.doc.item_category || !frm.doc.customer || !frm.doc.style) {
            frappe.msgprint("Please fill in the required fields: Item Category, Customer, and Style.");
            frappe.validated = false;
            return;
        }

        let item_code = `${frm.doc.item_category} - ${frm.doc.customer} - ${frm.doc.style}`.toUpperCase();
        let item_name = item_code;

        function createItem(item_code, item_name, success_message, additional_fields = {}) {
            frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: Object.assign({
                        doctype: "Item",
                        item_code: item_code,
                        item_name: item_name.toUpperCase(),
                        item_group: frm.doc.item_category,
                        description: `Item for Customer: ${frm.doc.customer}`,
                        stock_uom: "Nos",
                        is_stock_item: 1,
                        is_sweater: 1,
                        item_category: frm.doc.item_category,
                    }, additional_fields)
                },
                callback: function (r) {
                    if (r.message) {
                        console.log("Item created successfully:", r.message);
                        frappe.msgprint(success_message);
                    } else {
                        console.log("Failed to create item:", r);
                    }
                }
            });
        }

        // Create Sweater Item
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Item",
                filters: { "item_code": item_code },
                fields: ["name"]
            },
            callback: function (r) {
                if (r.message.length === 0) {
                    createItem(item_code, item_name, "Sweater item created successfully!", { is_sweater: 1 });
                } else {
                    console.log("Sweater item already exists:", item_code);
                }

                // Create Yarn Items
                if (frm.doc.material_requirement && frm.doc.material_requirement.length > 0) {
                    frm.doc.material_requirement.forEach(row => {
                        if (row.category && row.category.toLowerCase() === "yarn" && row.yarn_composition && row.yarn_count) {
                            let yarn_item_code = `YARN - ${frm.doc.customer} - ${frm.doc.style} - ${row.yarn_composition} - ${row.yarn_count}`.toUpperCase();
                            let yarn_item_name = yarn_item_code;

                            frappe.call({
                                method: "frappe.client.get_list",
                                args: {
                                    doctype: "Item",
                                    filters: { "item_code": yarn_item_code },
                                    fields: ["name"]
                                },
                                callback: function (r) {
                                    if (r.message.length === 0) {
                                        console.log("Creating Yarn Item:", yarn_item_code);
                                        createItem(yarn_item_code, yarn_item_name, "Yarn item created successfully!", {
                                            item_group: "Yarn",
                                            description: `Yarn Composition: ${row.yarn_composition}, Yarn Count: ${row.yarn_count}`
                                        });
                                    } else {
                                        console.log("Yarn item already exists:", yarn_item_code);
                                    }
                                }
                            });
                        }
                    });
                }
            }
        });
    }
});


function set_requested_by(frm) {
    if (!frm.doc.requested_by) {
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Employee",
                filters: { user_id: frappe.session.user },
                fields: ["name", "employee_name"], // only fields allowed on client-side
                limit_page_length: 1
            },
            callback: function (response) {
                if (response.message && response.message.length > 0) {
                    let employee = response.message[0];
                    
                    frm.set_value("requested_by", employee.name); // Link field needs docname
                    frm.set_df_property("requested_by", "description", employee.employee_name); // Show the name in description
                } else {
                    frappe.msgprint(__('No Employee record found for this user.'));
                }
            }
        });
    }
}

function set_request_date(frm) {
    if (!frm.doc.request_date) {
        frm.set_value("request_date", frappe.datetime.now_datetime());
    }
}

function set_style_filter(frm) {
    frm.set_query("style_name", function () {
        return {
            filters: {
                "item_group": "SWEATER"  // Uppercase as you mentioned
            }
        };
    });
}