from pydantic import BaseModel, Field


class BusinessDetailsCreateRequest(BaseModel):
    fssai_license_no: str = Field(
        min_length=1,
        max_length=50
    )

    gst_number: str | None = Field(
        default=None,
        max_length=20
    )

    pan_number: str = Field(
        min_length=1,
        max_length=20
    )

    bank_name: str = Field(
        min_length=1,
        max_length=150
    )

    account_number: str = Field(
        min_length=1,
        max_length=50
    )

    ifsc_code: str = Field(
        min_length=1,
        max_length=20
    )

    upi_id: str | None = Field(
        default=None,
        max_length=100
    )


class BusinessDetailsCreateResponse(BaseModel):
    message: str
    business_details_id: str